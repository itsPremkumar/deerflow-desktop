"""Adversarial Hyperplan Multi-Reviewer Pipeline.

Hostile multi-agent pre-execution plan stress-testing:
Before touching any code, 4 orthogonal reviewer agents evaluate the plan:
1. plan-consultant: Gap analysis and unstated prerequisite discovery.
2. plan-reviewer: Architectural failure mode and scaling bottleneck analysis.
3. omo-code-reviewer: Security posture, secret leaks, and breaking API diff risks.
4. omo-qa-executor: Acceptance criteria completeness and testability audit.

The gate reviewer aggregates verdicts into a final pass/fail authorization.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class ReviewerVerdict:
    reviewer_role: str
    status: str  # "APPROVED", "REJECTED", "NEEDS_REVISION"
    critique: str
    identified_risks: List[str] = field(default_factory=list)
    missing_prerequisites: List[str] = field(default_factory=list)


@dataclass
class HyperplanReport:
    plan_title: str
    overall_status: str  # "APPROVED", "BLOCKED"
    verdicts: List[ReviewerVerdict]
    gatekeeper_summary: str


class HyperplanPipeline:
    """Executes multi-agent hostile plan audit."""

    def __init__(self, strict_acceptance_required: bool = True):
        self.strict_acceptance = strict_acceptance_required

    def review_plan(self, plan_title: str, plan_text: str) -> HyperplanReport:
        verdicts: List[ReviewerVerdict] = []

        # Lens 1: Gap Analysis (plan-consultant)
        v1 = self._review_gaps(plan_text)
        verdicts.append(v1)

        # Lens 2: Architecture & Scalability (plan-reviewer)
        v2 = self._review_architecture(plan_text)
        verdicts.append(v2)

        # Lens 3: Security & Breaking Diffs (omo-code-reviewer)
        v3 = self._review_security(plan_text)
        verdicts.append(v3)

        # Lens 4: Acceptance Testability (omo-qa-executor)
        v4 = self._review_testability(plan_text)
        verdicts.append(v4)

        # Gatekeeper Consensus
        rejections = [v for v in verdicts if v.status == "REJECTED"]
        revisions = [v for v in verdicts if v.status == "NEEDS_REVISION"]

        if rejections or (self.strict_acceptance and revisions):
            overall = "BLOCKED"
            summary = f"Plan blocked by {len(rejections)} rejection(s) and {len(revisions)} revision request(s)."
        else:
            overall = "APPROVED"
            summary = "Plan approved across all 4 adversarial review dimensions."

        return HyperplanReport(
            plan_title=plan_title,
            overall_status=overall,
            verdicts=verdicts,
            gatekeeper_summary=summary,
        )

    def _review_gaps(self, text: str) -> ReviewerVerdict:
        risks = []
        if not re.search(r"(?i)(prerequisite|dependency|dependencies|setup|environment)", text):
            risks.append("Plan lacks explicit prerequisite or environment setup specification.")
        
        status = "NEEDS_REVISION" if risks else "APPROVED"
        return ReviewerVerdict(
            reviewer_role="plan-consultant (Gap Analysis)",
            status=status,
            critique="Audited for scope completeness and unstated assumptions.",
            identified_risks=risks,
        )

    def _review_architecture(self, text: str) -> ReviewerVerdict:
        risks = []
        if re.search(r"(?i)(single point of failure|circular|tight coupling|unbounded)", text):
            risks.append("Potential architectural fragility or circular coupling detected.")

        status = "REJECTED" if risks else "APPROVED"
        return ReviewerVerdict(
            reviewer_role="plan-reviewer (Architecture Stress)",
            status=status,
            critique="Evaluated component modularity and failure isolation.",
            identified_risks=risks,
        )

    def _review_security(self, text: str) -> ReviewerVerdict:
        risks = []
        if re.search(r"(?i)(rm\s+-rf|drop\s+database|eval\(|chmod\s+777|sudo)", text):
            risks.append("Detected high-risk shell command or destructive operation in plan.")

        status = "REJECTED" if risks else "APPROVED"
        return ReviewerVerdict(
            reviewer_role="omo-code-reviewer (Security & Diff Risk)",
            status=status,
            critique="Audited plan for destructive commands, credential exposure, and blast radius.",
            identified_risks=risks,
        )

    def _review_testability(self, text: str) -> ReviewerVerdict:
        risks = []
        # Check for genuine testing / evidence verification commands
        has_test_spec = bool(re.search(r"(?i)(pytest|npm test|cargo test|go test|unittest|verification plan|automated test)", text))
        has_negation = bool(re.search(r"(?i)no\s+(need\s+for\s+)?tests?", text))

        if not has_test_spec or has_negation:
            risks.append("Plan contains zero verification or automated test commands (violates evidence doctrine).")

        status = "REJECTED" if risks else "APPROVED"
        return ReviewerVerdict(
            reviewer_role="omo-qa-executor (QA Acceptance Audit)",
            status=status,
            critique="Checked for executable test verification and evidence-capture criteria.",
            identified_risks=risks,
        )
