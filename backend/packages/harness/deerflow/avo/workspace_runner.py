"""Workspace AVO Runner: Grounded Workspace Candidate Execution with Auto-Rollback.

Integrates NVIDIA AVO's evolutionary loop directly with real workspace code files:
1. Micro-checkpoints target file before mutation.
2. Applies modification and executes empirical tests/benchmarks.
3. Evaluates multi-dimensional vector f(x) with hard binary correctness gate.
4. Auto-rollbacks workspace on failure/regression; commits and persists on improvement.
"""

from __future__ import annotations

import json
import logging
import shlex
import subprocess
import sys
import time
from pathlib import Path
from .knowledge import DomainKnowledgeBase
from .lineage import AVOLineage, VersionRecord
from .persistence import AVOPersistenceManager
from .scoring import EvaluationVector
from .supervisor import AVOSupervisor

logger = logging.getLogger("deerflow.avo.workspace_runner")


class WorkspaceAVORunner:
    """Executes grounded evolutionary variation against real files with safety rollback."""

    def __init__(
        self,
        lineage: AVOLineage | None = None,
        knowledge_base: DomainKnowledgeBase | None = None,
        supervisor: AVOSupervisor | None = None,
        persistence_mgr: AVOPersistenceManager | None = None,
        root_path: str | Path | None = None,
    ) -> None:
        self.root_path = Path(root_path).resolve() if root_path else Path.cwd()
        self.persistence_mgr = persistence_mgr or AVOPersistenceManager(self.root_path)

        # Restore from disk if existing, or use provided/new instances
        self.lineage = lineage or self.persistence_mgr.load_lineage() or AVOLineage()
        self.knowledge_base = knowledge_base or self.persistence_mgr.load_knowledge_base() or DomainKnowledgeBase()
        self.supervisor = supervisor or AVOSupervisor()

    def run_workspace_variation(
        self,
        target_file_path: str,
        candidate_code: str,
        hypothesis: str,
        modification: str,
        test_command: str | None = None,
        expected_metrics: dict[str, float] | None = None,
        parent_id: str | None = None,
        timeout_seconds: float = 30.0,
    ) -> dict[str, Any]:
        """Execute a grounded variation step on a workspace file with auto-rollback."""
        target_path = Path(target_file_path)
        if not target_path.is_absolute():
            target_path = self.root_path / target_path

        if not target_path.exists():
            return {
                "success": False,
                "committed": False,
                "error": f"Target file does not exist: {target_file_path}",
                "rolled_back": False,
            }

        effective_parent = parent_id or self.lineage.head_id

        from deerflow.tools.builtins.code_agentic_core import manage_code_checkpoint

        try:
            rel_file = str(target_path.relative_to(self.root_path))
        except ValueError:
            rel_file = target_file_path

        # 1. Create safety micro-checkpoint of baseline state
        checkpoint_label = f"avo_pre_{time.time_ns()}"
        cp_res_raw = manage_code_checkpoint.invoke({
            "action": "create",
            "label": checkpoint_label,
            "target_files": [rel_file],
            "root_path": str(self.root_path),
        })
        try:
            cp_res = json.loads(cp_res_raw)
            checkpoint_id = cp_res.get("checkpoint_id", checkpoint_label)
        except Exception:
            checkpoint_id = checkpoint_label

        # 2. Write candidate modification to target file
        try:
            target_path.write_text(candidate_code, encoding="utf-8")
        except Exception as e:
            return {
                "success": False,
                "committed": False,
                "error": f"Failed to write candidate code: {e}",
                "rolled_back": False,
            }

        # 3. Execute test/benchmark command
        cmd = test_command or f'"{sys.executable}" -m pytest'
        start_time = time.time()
        try:
            result = subprocess.run(
                cmd,
                shell=True,
                cwd=str(self.root_path),
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
            )
            duration = time.time() - start_time
            correctness = (result.returncode == 0)
            stdout = result.stdout
            stderr = result.stderr
        except subprocess.TimeoutExpired:
            duration = timeout_seconds
            correctness = False
            stdout = ""
            stderr = f"Evaluation command timed out after {timeout_seconds}s"
        except Exception as e:
            duration = 0.0
            correctness = False
            stdout = ""
            stderr = str(e)

        # 4. Compute performance vector
        # Shorter execution time is higher performance speedup
        perf_score = max(0.01, round(1.0 / max(0.01, duration), 4))
        metrics = {"throughput": perf_score, "duration_s": round(duration, 3)}
        if expected_metrics:
            metrics.update(expected_metrics)

        vector = EvaluationVector(
            metrics=metrics,
            correctness=correctness,
            metadata={"stdout_tail": stdout[-300:], "stderr_tail": stderr[-300:]},
        )

        candidate = VersionRecord(
            parent_id=effective_parent,
            hypothesis=hypothesis,
            modification=modification,
            correctness=correctness,
            vector=vector,
            performance_score=vector.effective_metric("throughput"),
            quality_score=1.0 if correctness else 0.0,
            diff_summary=modification,
            metadata={"target_file": str(target_path), "checkpoint_id": checkpoint_id},
        )

        # 5. Evaluate matches-or-improves commit policy
        committed = self.lineage.commit_candidate(candidate)

        # 6. Checkpoint management: rollback if failed/regressed, retain if committed
        rolled_back = False
        if not committed:
            # Auto-rollback file to baseline checkpoint
            rollback_res_raw = manage_code_checkpoint.invoke({
                "action": "rollback",
                "checkpoint_id": checkpoint_id,
                "root_path": str(self.root_path),
            })
            rolled_back = True
            self.knowledge_base.record_negative_lesson(
                attempt_hypothesis=hypothesis,
                failure_reason=candidate.rejection_reason or "Score regression or test failure",
            )
        else:
            self.knowledge_base.record_positive_pattern(
                hypothesis=hypothesis,
                modification_summary=modification,
                measured_gain=f"geomean={vector.geometric_mean():.4f} (duration={duration:.3f}s)",
            )

        # 7. Observe supervisor for anti-stagnation
        signature = f"{modification[:30]}_{correctness}"
        stagnated, directive, diag = self.supervisor.observe_step(
            improved=committed,
            signature=signature,
            backtrack_candidate=effective_parent,
        )

        # 8. Persist updated lineage and knowledge base to disk
        self.persistence_mgr.save_lineage(self.lineage)
        self.persistence_mgr.save_knowledge_base(self.knowledge_base)

        return {
            "success": committed,
            "committed": committed,
            "rolled_back": rolled_back,
            "version_id": candidate.version_id,
            "parent_id": effective_parent,
            "correctness": correctness,
            "duration_seconds": round(duration, 3),
            "performance_score": perf_score,
            "rejection_reason": candidate.rejection_reason,
            "supervisor_intervention": stagnated,
            "supervisor_directive": directive.to_dict() if directive else None,
            "supervisor_status": diag,
            "stdout_snippet": stdout[-200:] if stdout else None,
            "stderr_snippet": stderr[-200:] if stderr else None,
        }
