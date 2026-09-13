"""TheoryOfMindConsultant: Synthesizes implicit human user mental models and expectations."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from deerflow.reasoning.tom.models import (
    IntentHypothesis,
    PriorityDomain,
    RiskTolerance,
)

logger = logging.getLogger(__name__)


class TheoryOfMindConsultant:
    """Cognitive modeler hypothesizing implicit human expectations, invariants, and failure modes."""

    def consult(
        self,
        task_description: str,
        workspace_context: Optional[str] = None,
        context_metadata: Optional[Dict[str, Any]] = None,
    ) -> IntentHypothesis:
        text = task_description.lower()
        priorities: List[PriorityDomain] = []
        unstated_expectations: List[str] = []
        pitfalls: List[str] = []
        constraints: List[str] = []
        risk_tolerance = RiskTolerance.MEDIUM

        # 1. Detect Task Intent & Invariants
        if "refactor" in text or "clean" in text or "simplify" in text:
            priorities.extend([PriorityDomain.BACKWARD_COMPATIBILITY, PriorityDomain.CORRECTNESS, PriorityDomain.READABILITY])
            unstated_expectations.extend([
                "Maintain exact same behavior for all external callers and public APIs.",
                "Preserve existing unit test suite compatibility; all tests must remain green.",
                "Do not introduce unrelated code formatting or stylistic reordering outside the target module.",
            ])
            pitfalls.append("Changing return types or method signatures that break downstream consumers.")
            constraints.append("Refactor in small verified increments rather than massive file rewrites.")

        elif "fix" in text or "bug" in text or "issue" in text or "error" in text:
            priorities.extend([PriorityDomain.CORRECTNESS, PriorityDomain.MINIMAL_DIFF, PriorityDomain.TEST_COVERAGE])
            unstated_expectations.extend([
                "Keep diff minimal and focused strictly on fixing the root cause.",
                "Add a regression test reproducing the issue and proving the fix works.",
                "Ensure no edge cases in adjacent code are broken by the patch.",
            ])
            pitfalls.append("Attempting wide refactorings while fixing a localized bug.")
            constraints.append("Do not modify unrelated files; isolate the fix to the offending component.")

        elif "perf" in text or "fast" in text or "speed" in text or "optimize" in text:
            priorities.extend([PriorityDomain.PERFORMANCE, PriorityDomain.CORRECTNESS])
            unstated_expectations.extend([
                "Verify performance improvements empirically with before/after measurements.",
                "Ensure algorithmic optimizations do not introduce concurrency or memory race conditions.",
            ])
            pitfalls.append("Over-optimizing code at the expense of maintainability without measuring real bottlenecks.")
            constraints.append("Profile or benchmark before and after applying optimizations.")

        else:
            priorities.extend([PriorityDomain.CORRECTNESS, PriorityDomain.READABILITY])
            unstated_expectations.extend([
                "Deliver complete and production-ready code with no placeholder 'TODO' comments.",
                "Follow established codebase styling, naming conventions, and file structures.",
            ])
            constraints.append("Verify code compiles and passes tests before claiming completion.")

        # 2. Risk tolerance inference
        if any(w in text for w in ["prod", "production", "critical", "security", "auth", "finance"]):
            risk_tolerance = RiskTolerance.LOW
            constraints.append("Zero tolerance for unverified assumptions; run complete regression suites.")
        elif any(w in text for w in ["poc", "prototype", "experiment", "spike", "hack"]):
            risk_tolerance = RiskTolerance.HIGH

        return IntentHypothesis(
            stated_goal=task_description.strip(),
            inferred_intent=f"Engineered fulfillment of '{task_description.strip()[:60]}...' with enterprise safety.",
            risk_tolerance=risk_tolerance,
            top_priorities=priorities,
            unstated_expectations=unstated_expectations,
            pitfalls_to_avoid=pitfalls,
            recommended_constraints=constraints,
            confidence_score=0.90,
        )
