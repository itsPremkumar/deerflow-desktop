from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any, Dict, Optional

from .lineage import AVOLineage, VersionRecord
from .supervisor import AVOSupervisor

logger = logging.getLogger("deerflow.avo.engine")


class AVOEngine:
    """
    Autonomous Value Optimization (AVO) Engine.
    Executes evolutionary search with lineage tracking and stagnation intervention.
    """

    def __init__(
        self,
        lineage: Optional[AVOLineage] = None,
        supervisor: Optional[AVOSupervisor] = None,
    ) -> None:
        self.lineage = lineage or AVOLineage()
        self.supervisor = supervisor or AVOSupervisor()
        self.iteration_count: int = 0

    def run_iteration(
        self,
        hypothesis: str,
        modification: str,
        evaluate_fn: Callable[[], Dict[str, Any]],
        parent_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        self.iteration_count += 1
        effective_parent = parent_id or self.lineage.head_id

        # Evaluate candidate empirically
        eval_result = evaluate_fn()
        correctness = bool(eval_result.get("correctness", False))
        perf = float(eval_result.get("performance", 0.0))
        qual = float(eval_result.get("quality", 0.0))

        candidate = VersionRecord(
            parent_id=effective_parent,
            hypothesis=hypothesis,
            modification=modification,
            correctness=correctness,
            performance_score=perf,
            quality_score=qual,
            metadata=eval_result.get("metadata", {}),
        )

        committed = self.lineage.commit_candidate(candidate)
        stagnated, diag = self.supervisor.observe(improved=committed)

        return {
            "iteration": self.iteration_count,
            "version_id": candidate.version_id,
            "committed": committed,
            "composite_score": candidate.composite_score,
            "current_head": self.lineage.head_id,
            "stagnation_detected": stagnated,
            "diagnostic": diag,
        }

    def stats(self) -> Dict[str, Any]:
        return {
            "iteration_count": self.iteration_count,
            "lineage": self.lineage.stats(),
            "supervisor": self.supervisor.stats(),
        }
