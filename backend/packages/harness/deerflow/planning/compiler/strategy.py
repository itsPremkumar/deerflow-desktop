from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class StrategyArchetype(str, Enum):
    MINIMALIST = "minimalist_direct"
    STAGED = "staged_robust"
    SWARM = "swarm_exploratory"


@dataclass
class StrategyCandidate:
    """Discrete strategy candidate formulated during P8/P9 planning."""
    archetype: StrategyArchetype
    name: str
    description: str
    success_prob: float        # 0.0 to 1.0
    reversibility: float       # 0.0 to 1.0 (1.0 = fully reversible)
    risk_score: float          # 0.0 to 1.0 (0.0 = zero risk)
    token_cost_estimate: int   # approximate tokens
    latency_ms_estimate: float # approximate latency
    pros: List[str] = field(default_factory=list)
    cons: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def score(self, weights: Optional[Dict[str, float]] = None) -> float:
        w = {
            "success": 0.45,
            "reversibility": 0.25,
            "risk": 0.20,
            "cost": 0.10,
        }
        if weights:
            w.update(weights)

        # Normalize token cost (assuming 100,000 max typical budget)
        norm_cost = min(1.0, self.token_cost_estimate / 100000.0)

        composite = (
            w["success"] * self.success_prob
            + w["reversibility"] * self.reversibility
            - w["risk"] * self.risk_score
            - w["cost"] * norm_cost
        )
        return round(composite, 4)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "archetype": self.archetype.value,
            "name": self.name,
            "description": self.description,
            "success_prob": self.success_prob,
            "reversibility": self.reversibility,
            "risk_score": self.risk_score,
            "token_cost_estimate": self.token_cost_estimate,
            "latency_ms_estimate": self.latency_ms_estimate,
            "composite_score": self.score(),
            "pros": self.pros,
            "cons": self.cons,
            "metadata": self.metadata,
        }


def generate_strategy_candidates(goal: str, risk_tier: str = "R1") -> List[StrategyCandidate]:
    """P8 Strategy Generation: emit discrete Candidates A, B, and C."""
    # Candidate A: Minimalist Direct
    cand_a = StrategyCandidate(
        archetype=StrategyArchetype.MINIMALIST,
        name="Candidate A: Minimalist Direct Execution",
        description=f"Direct atomic patch for '{goal}' with zero intermediate branching.",
        success_prob=0.80 if risk_tier in ("R0", "R1") else 0.55,
        reversibility=0.70,
        risk_score=0.20 if risk_tier in ("R0", "R1") else 0.50,
        token_cost_estimate=8000,
        latency_ms_estimate=2500,
        pros=["Fastest time to execution", "Minimal token overhead"],
        cons=["Higher risk if hidden dependencies exist"],
    )

    # Candidate B: Staged Robust
    cand_b = StrategyCandidate(
        archetype=StrategyArchetype.STAGED,
        name="Candidate B: Staged Robust with Worktree Isolation",
        description=f"Isolated worktree staging, pre-flight AST verification, and regression test suites for '{goal}'.",
        success_prob=0.95,
        reversibility=0.98,
        risk_score=0.08,
        token_cost_estimate=22000,
        latency_ms_estimate=7500,
        pros=["Near zero blast-radius risk", "High confidence verification oracles", "Safe rollback"],
        cons=["Higher token cost", "Moderate latency increase"],
    )

    # Candidate C: Swarm Exploratory
    cand_c = StrategyCandidate(
        archetype=StrategyArchetype.SWARM,
        name="Candidate C: Parallel Swarm Spike",
        description=f"Multi-agent exploratory swarm investigating alternative architectures for '{goal}'.",
        success_prob=0.88,
        reversibility=0.85,
        risk_score=0.25,
        token_cost_estimate=45000,
        latency_ms_estimate=12000,
        pros=["Explores novel solutions", "Surfaces blindspots"],
        cons=["Expensive token usage", "Coordination overhead"],
    )

    return [cand_a, cand_b, cand_c]
