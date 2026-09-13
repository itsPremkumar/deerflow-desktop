from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .fallbacks import RecoveryFallbackTree
from .strategy import StrategyCandidate, generate_strategy_candidates
from .waves import ExecutionWave, partition_execution_waves


@dataclass
class ExecutionPlanIR:
    """Immutable compiled execution intermediate representation emitted by P20."""
    plan_id: str
    goal: str
    risk_tier: str
    chosen_strategy: StrategyCandidate
    candidate_strategies: List[StrategyCandidate]
    execution_waves: List[ExecutionWave]
    recovery_tree: RecoveryFallbackTree
    proof_obligations: List[str] = field(default_factory=list)
    compiled_at: float = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "plan_id": self.plan_id,
            "goal": self.goal,
            "risk_tier": self.risk_tier,
            "chosen_strategy": self.chosen_strategy.to_dict(),
            "candidate_strategies": [s.to_dict() for s in self.candidate_strategies],
            "execution_waves": [w.to_dict() for w in self.execution_waves],
            "recovery_tree": self.recovery_tree.to_dict(),
            "proof_obligations": self.proof_obligations,
            "compiled_at": self.compiled_at,
        }


class CognitiveCompiler:
    """
    Hermes P0–P21 Pre-Execution Cognitive Compiler.
    Compiles a mission into an immutable, structured ExecutionPlanIR
    BEFORE committing any real tool calls or shell commands.
    """

    def __init__(self) -> None:
        pass

    def compile(
        self,
        goal: str,
        task_dag: Optional[Dict[str, List[str]]] = None,
        risk_tier: str = "R1",
        proof_obligations: Optional[List[str]] = None,
    ) -> ExecutionPlanIR:
        plan_id = f"plan_ir_{uuid.uuid4().hex[:10]}"

        # P8 & P9: Generate & evaluate Strategy Candidates (A, B, C)
        candidates = generate_strategy_candidates(goal=goal, risk_tier=risk_tier)
        # Select best scoring candidate
        chosen = max(candidates, key=lambda c: c.score())

        # P10, P11, P12: Goal Decomposition, Dependencies, and Parallel Execution Waves
        effective_dag = task_dag or {
            "recon_environment": [],
            "synthesize_patch": ["recon_environment"],
            "run_unit_tests": ["synthesize_patch"],
            "verify_acceptance": ["run_unit_tests"],
        }
        waves = partition_execution_waves(effective_dag)

        # P19: Pre-computed Recovery Fallbacks
        recovery_tree = RecoveryFallbackTree(
            primary_strategy=f"Execute {chosen.name} via planned execution waves.",
            fallback_a="Switch to AST Isolated Worktree sandbox and alternate tool driver.",
            fallback_b="Gracefully degrade scope: generate non-breaking minimal shim and request verification.",
            escalation_threshold=2,
        )

        # Proof obligations
        obligations = proof_obligations or [
            "all_pre_existing_tests_must_pass",
            "zero_unhandled_syntax_errors",
            "blast_radius_confined_to_workspace",
        ]

        return ExecutionPlanIR(
            plan_id=plan_id,
            goal=goal,
            risk_tier=risk_tier,
            chosen_strategy=chosen,
            candidate_strategies=candidates,
            execution_waves=waves,
            recovery_tree=recovery_tree,
            proof_obligations=obligations,
        )
