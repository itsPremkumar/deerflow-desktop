from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, Tuple


class ReplanDecision(str, Enum):
    NOMINAL = "nominal"
    LOCAL_REPLAN = "local_replan"
    GLOBAL_REPLAN = "global_replan"


@dataclass
class PlanValidityReport:
    validity_score: float  # 0.0 to 1.0
    decision: ReplanDecision
    passed_tasks: int
    failed_tasks: int
    total_tasks: int
    invariant_breach: bool
    diagnostic: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "validity_score": self.validity_score,
            "decision": self.decision.value,
            "passed_tasks": self.passed_tasks,
            "failed_tasks": self.failed_tasks,
            "total_tasks": self.total_tasks,
            "invariant_breach": self.invariant_breach,
            "diagnostic": self.diagnostic,
        }


class PlanValidityMonitor:
    """
    Monitors live plan execution health.
    Evaluates validity score V in [0.0, 1.0]:
      V >= 0.70 -> NOMINAL execution
      0.40 <= V < 0.70 -> LOCAL_REPLAN (patch single subgoal)
      V < 0.40 or Invariant Breach -> GLOBAL_REPLAN (full mission recompilation)
    """

    @staticmethod
    def evaluate(
        passed_tasks: int,
        failed_tasks: int,
        total_tasks: int,
        invariant_breach: bool = False,
        consecutive_failures: int = 0,
    ) -> PlanValidityReport:
        if total_tasks <= 0:
            total_tasks = 1

        if invariant_breach:
            return PlanValidityReport(
                validity_score=0.0,
                decision=ReplanDecision.GLOBAL_REPLAN,
                passed_tasks=passed_tasks,
                failed_tasks=failed_tasks,
                total_tasks=total_tasks,
                invariant_breach=True,
                diagnostic="CRITICAL: Kernel safety invariant breached. Forcing GLOBAL_REPLAN.",
            )

        pass_rate = passed_tasks / total_tasks
        fail_penalty = (failed_tasks / total_tasks) * 0.5
        consecutive_penalty = min(0.3, consecutive_failures * 0.15)

        raw_v = pass_rate - fail_penalty - consecutive_penalty
        v = round(max(0.0, min(1.0, raw_v)), 3)

        if v >= 0.70 and consecutive_failures == 0:
            decision = ReplanDecision.NOMINAL
            diag = "Plan health is NOMINAL. Continuing current execution waves."
        elif v >= 0.40 and consecutive_failures <= 1:
            decision = ReplanDecision.LOCAL_REPLAN
            diag = f"Plan health degraded (V={v}). Triggering LOCAL_REPLAN for failed subgoals."
        else:
            decision = ReplanDecision.GLOBAL_REPLAN
            diag = f"Plan health critical (V={v}, consecutive_fails={consecutive_failures}). Triggering GLOBAL_REPLAN."

        return PlanValidityReport(
            validity_score=v,
            decision=decision,
            passed_tasks=passed_tasks,
            failed_tasks=failed_tasks,
            total_tasks=total_tasks,
            invariant_breach=False,
            diagnostic=diag,
        )
