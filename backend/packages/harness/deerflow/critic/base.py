"""Base interfaces and data structures for the Critic verification subsystem."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class CriticVerdict(str, Enum):
    """Verdict returned by a Critic evaluation."""
    APPROVED = "approved"
    REJECTED = "rejected"
    WARNING = "warning"


@dataclass
class CriticResult:
    """Outcome of a Critic check."""
    verdict: CriticVerdict
    reason: str
    diagnostic_prompt: Optional[str] = None
    critic_name: str = "BaseCritic"
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def is_approved(self) -> bool:
        return self.verdict == CriticVerdict.APPROVED

    @property
    def is_rejected(self) -> bool:
        return self.verdict == CriticVerdict.REJECTED

    def to_dict(self) -> Dict[str, Any]:
        return {
            "verdict": self.verdict.value,
            "reason": self.reason,
            "diagnostic_prompt": self.diagnostic_prompt,
            "critic_name": self.critic_name,
            "metadata": self.metadata,
        }


class BaseCritic(ABC):
    """Abstract base class for all completion and quality critics."""

    name: str = "base_critic"

    @abstractmethod
    def evaluate(
        self,
        task_description: str,
        execution_history: Optional[List[Dict[str, Any]]] = None,
        workspace_dir: Optional[str] = None,
        **kwargs: Any,
    ) -> CriticResult:
        """Evaluate task completion state and return a CriticResult."""
        pass
