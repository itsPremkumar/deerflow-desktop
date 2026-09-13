"""Models for Episodic Experience Memory and Reflection."""

from __future__ import annotations

import time
import uuid
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class OutcomeType(str, Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    PARTIAL = "partial"


@dataclass
class ExperienceRecord:
    """Episodic memory record capturing lessons, pitfalls, and solutions from past trajectories."""
    task_goal: str
    outcome: OutcomeType
    lessons_learned: List[str] = field(default_factory=list)
    pitfalls_to_avoid: List[str] = field(default_factory=list)
    modified_files: List[str] = field(default_factory=list)
    error_types: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    experience_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["outcome"] = self.outcome.value
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> ExperienceRecord:
        payload = dict(data)
        if "outcome" in payload and isinstance(payload["outcome"], str):
            payload["outcome"] = OutcomeType(payload["outcome"])
        return cls(**payload)
