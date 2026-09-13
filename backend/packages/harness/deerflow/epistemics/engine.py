"""EpistemicBeliefEngine: Manages belief graph, Bayesian updating, and falsification tracking."""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple

from deerflow.epistemics.models import Claim, EpistemicStatus

logger = logging.getLogger(__name__)


class EpistemicBeliefEngine:
    """Belief engine maintaining calibrated truth claims, Bayesian updating, and falsification tests."""

    def __init__(self):
        self._claims: Dict[str, Claim] = {}

    def register_claim(
        self,
        text: str,
        status: EpistemicStatus = EpistemicStatus.HYPOTHESIS,
        prior_confidence: float = 0.5,
        falsification_test: str = "",
        verification_method: str = "",
    ) -> Claim:
        """Register a new epistemic assertion."""
        claim = Claim(
            text=text.strip(),
            status=status,
            confidence=prior_confidence,
            bayesian_prior=prior_confidence,
            bayesian_posterior=prior_confidence,
            falsification_test=falsification_test.strip(),
            verification_method=verification_method.strip(),
        )
        self._claims[claim.claim_id] = claim
        return claim

    def get(self, claim_id: str) -> Optional[Claim]:
        return self._claims.get(claim_id)

    def list_all(self) -> List[Claim]:
        return list(self._claims.values())

    def update_with_evidence(
        self,
        claim_id: str,
        evidence: str,
        is_supporting: bool = True,
        likelihood_ratio: float = 3.0,
    ) -> Claim:
        """Perform a Bayesian update on the claim based on observed evidence."""
        claim = self._claims.get(claim_id)
        if not claim:
            raise KeyError(f"Claim with id '{claim_id}' not found.")

        # Compute prior odds: odds = p / (1 - p)
        p = max(0.01, min(0.99, claim.bayesian_posterior))
        prior_odds = p / (1.0 - p)

        if is_supporting:
            claim.supporting_evidence.append(evidence)
            post_odds = prior_odds * likelihood_ratio
        else:
            claim.contradicting_evidence.append(evidence)
            post_odds = prior_odds / likelihood_ratio

        # Convert back to probability
        p_post = post_odds / (1.0 + post_odds)
        claim.bayesian_posterior = round(p_post, 3)
        claim.confidence = claim.bayesian_posterior

        # Update epistemic status dynamically based on evidence
        if claim.bayesian_posterior >= 0.90 and len(claim.supporting_evidence) >= 2:
            claim.status = EpistemicStatus.FACT
        elif claim.bayesian_posterior <= 0.15:
            claim.status = EpistemicStatus.OBSOLETE
        elif claim.supporting_evidence and claim.contradicting_evidence:
            claim.status = EpistemicStatus.CONTRADICTION

        return claim

    def get_unverified_assumptions(self) -> List[Claim]:
        """Return claims marked as ASSUMPTION or HYPOTHESIS lacking empirical validation."""
        return [
            c for c in self._claims.values()
            if c.status in {EpistemicStatus.ASSUMPTION, EpistemicStatus.HYPOTHESIS}
            and not c.is_verified
        ]

    def render_belief_summary(self) -> str:
        """Render markdown summary of active claims and their epistemic statuses."""
        if not self._claims:
            return "No epistemic claims currently tracked."

        lines = ["### Epistemic Belief & Calibration Ledger\n"]
        for c in self._claims.values():
            verified_badge = "✅ FACT" if c.status == EpistemicStatus.FACT else f"[{c.status.value.upper()}]"
            lines.append(
                f"- **{verified_badge}** (Conf: {int(c.confidence * 100)}%): {c.text}"
            )
            if c.falsification_test:
                lines.append(f"  * *Falsification Test*: {c.falsification_test}")
            if c.supporting_evidence:
                lines.append(f"  * *Support*: {len(c.supporting_evidence)} items")
            if c.contradicting_evidence:
                lines.append(f"  * *Contradictions*: {len(c.contradicting_evidence)} items")

        return "\n".join(lines)
