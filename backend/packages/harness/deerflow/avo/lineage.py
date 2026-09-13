from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class VersionRecord:
    """Immutable version record in the AVO evolution lineage."""
    version_id: str = field(default_factory=lambda: f"v_{uuid.uuid4().hex[:8]}")
    parent_id: Optional[str] = None
    hypothesis: str = ""
    modification: str = ""
    correctness: bool = False
    performance_score: float = 0.0  # 0.0 to 1.0
    quality_score: float = 0.0      # 0.0 to 1.0
    composite_score: float = 0.0    # weighted score
    created_at: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def compute_composite(
        self,
        w_correctness: float = 0.5,
        w_performance: float = 0.3,
        w_quality: float = 0.2,
    ) -> float:
        if not self.correctness:
            self.composite_score = 0.0
            return 0.0
        score = (
            w_correctness * 1.0
            + w_performance * min(1.0, self.performance_score)
            + w_quality * min(1.0, self.quality_score)
        )
        self.composite_score = round(score, 4)
        return self.composite_score

    def to_dict(self) -> Dict[str, Any]:
        return {
            "version_id": self.version_id,
            "parent_id": self.parent_id,
            "hypothesis": self.hypothesis,
            "modification": self.modification,
            "correctness": self.correctness,
            "performance_score": self.performance_score,
            "quality_score": self.quality_score,
            "composite_score": self.composite_score,
            "created_at": self.created_at,
            "metadata": self.metadata,
        }


class AVOLineage:
    """
    Maintains historical evolution tree and strictly enforces
    the matches-or-improves commit policy.
    """

    def __init__(self) -> None:
        self.versions: Dict[str, VersionRecord] = {}
        self.head_id: Optional[str] = None

    def commit_candidate(self, candidate: VersionRecord) -> bool:
        """
        Matches-or-improves commit policy:
          - FAIL correctness -> discard (return False)
          - Worse composite score than parent -> reject (return False)
          - Matches or improves parent -> accept & commit
          - Strictly improves current head -> promote to new head
        """
        # Hard correctness gate
        if not candidate.correctness:
            return False

        candidate.compute_composite()

        if candidate.parent_id and candidate.parent_id in self.versions:
            parent = self.versions[candidate.parent_id]
            if candidate.composite_score < parent.composite_score:
                return False  # Regressed below parent

        self.versions[candidate.version_id] = candidate

        # Update head if this is first version or strictly exceeds current head
        if self.head_id is None:
            self.head_id = candidate.version_id
        else:
            current_head = self.versions[self.head_id]
            if candidate.composite_score > current_head.composite_score:
                self.head_id = candidate.version_id

        return True

    def get_version(self, version_id: str) -> Optional[VersionRecord]:
        return self.versions.get(version_id)

    def get_head(self) -> Optional[VersionRecord]:
        if not self.head_id:
            return None
        return self.versions.get(self.head_id)

    def get_history(self) -> List[VersionRecord]:
        return sorted(self.versions.values(), key=lambda v: v.created_at)

    def stats(self) -> Dict[str, Any]:
        head = self.get_head()
        return {
            "total_versions": len(self.versions),
            "head_id": self.head_id,
            "head_score": head.composite_score if head else 0.0,
        }
