"""CriticPipeline: coordinates execution across multiple verification critics."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from deerflow.critic.agent_finished import AgentFinishedCritic
from deerflow.critic.base import BaseCritic, CriticResult, CriticVerdict
from deerflow.critic.empty_patch import EmptyPatchCritic
from deerflow.critic.rubric import RubricEvaluator

logger = logging.getLogger(__name__)


class CriticPipeline:
    """Manages a sequence of completion critics and generates unified verdicts."""

    def __init__(self, critics: Optional[List[BaseCritic]] = None):
        if critics is not None:
            self.critics = critics
        else:
            self.critics = [
                AgentFinishedCritic(),
                EmptyPatchCritic(),
            ]

    def add_critic(self, critic: BaseCritic) -> None:
        self.critics.append(critic)

    def evaluate(
        self,
        task_description: str,
        execution_history: Optional[List[Dict[str, Any]]] = None,
        workspace_dir: Optional[str] = None,
        **kwargs: Any,
    ) -> CriticResult:
        """Run all critics. If any rejects, return a rejected verdict."""
        rejections: List[CriticResult] = []
        warnings: List[CriticResult] = []
        all_results: List[Dict[str, Any]] = []

        for critic in self.critics:
            res = critic.evaluate(
                task_description=task_description,
                execution_history=execution_history,
                workspace_dir=workspace_dir,
                **kwargs,
            )
            all_results.append(res.to_dict())

            if res.verdict == CriticVerdict.REJECTED:
                rejections.append(res)
            elif res.verdict == CriticVerdict.WARNING:
                warnings.append(res)

        if rejections:
            combined_reasons = "\n- ".join(r.reason for r in rejections)
            combined_prompts = "\n\n".join(
                r.diagnostic_prompt for r in rejections if r.diagnostic_prompt
            )
            return CriticResult(
                verdict=CriticVerdict.REJECTED,
                reason=f"Verification rejected by {len(rejections)} critic(s):\n- {combined_reasons}",
                diagnostic_prompt=combined_prompts,
                critic_name="CriticPipeline",
                metadata={"critic_results": all_results, "rejection_count": len(rejections)},
            )

        if warnings:
            combined_reasons = "\n- ".join(w.reason for w in warnings)
            return CriticResult(
                verdict=CriticVerdict.WARNING,
                reason=f"Verification warnings:\n- {combined_reasons}",
                diagnostic_prompt=warnings[0].diagnostic_prompt,
                critic_name="CriticPipeline",
                metadata={"critic_results": all_results, "warning_count": len(warnings)},
            )

        return CriticResult(
            verdict=CriticVerdict.APPROVED,
            reason="All critics approved completion.",
            critic_name="CriticPipeline",
            metadata={"critic_results": all_results},
        )
