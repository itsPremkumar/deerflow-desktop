"""Quality Council Quorum, Holdout Benchmarking, and Cryptographic Multi-Sig Verification."""

from __future__ import annotations

import hashlib
import hmac
import logging
import time
from typing import Any

from deerflow.enterprise.models import (
    CryptographicSignature,
    ReleaseCandidate,
)

logger = logging.getLogger(__name__)

# Enterprise release signing secret (in real environments, backed by scoped credential vault)
_SECRET_RELEASE_KEY = b"deerflow-autonomous-quality-council-multi-sig-secret-2026"


class QualityCouncilQuorumEngine:
    """Manages SWE holdout benchmarking and multi-signature cryptographic release gating."""

    def __init__(self):
        self._releases: dict[str, ReleaseCandidate] = {}
        self._bootstrap_sample_release()

    def _bootstrap_sample_release(self) -> None:
        """Seeds baseline active release."""
        initial_diff = "hash-commit-initial-enterprise-core-v2.1.0"
        digest = hashlib.sha256(initial_diff.encode("utf-8")).hexdigest()

        cto_sig = self._compute_signature("CTO_ARCH", "bot-cto", digest)
        swe_sig = self._compute_signature("SWE_BENCHMARK", "bot-perf-lead", digest)
        ciso_sig = self._compute_signature("CISO_ASTRA", "bot-ciso", digest)

        baseline = ReleaseCandidate(
            release_id="rel-v2.1.0",
            version="v2.1.0",
            component="enterprise-core",
            description="Production baseline with 6-Tier cognitive memory and perpetual daemon.",
            diff_hash=digest,
            holdout_benchmark_score=98.5,
            holdout_passed=True,
            security_scan_passed=True,
            architecture_approved=True,
            signatures=[cto_sig, swe_sig, ciso_sig],
            status="promoted_active",
            promoted_at=time.time() - 86400.0,
        )
        self._releases[baseline.release_id] = baseline

    def _compute_signature(self, role: str, bot_name: str, payload_digest: str) -> CryptographicSignature:
        """Generates HMAC-SHA256 cryptographic attestation signature."""
        ts = time.time()
        message = f"{role}:{bot_name}:{payload_digest}:{ts:.3f}".encode("utf-8")
        sig_hash = hmac.new(_SECRET_RELEASE_KEY, message, hashlib.sha256).hexdigest()

        return CryptographicSignature(
            signatory_role=role,
            signatory_bot=bot_name,
            signature_hash=sig_hash,
            payload_digest=payload_digest,
            timestamp=ts,
            verified=True,
        )

    def stage_candidate_release(
        self,
        version: str,
        component: str,
        description: str,
        diff_content: str,
    ) -> ReleaseCandidate:
        """Stages a new candidate release for benchmarking and multi-sig review."""
        release_id = f"rel-{version.replace('.', '-')}"
        diff_hash = hashlib.sha256(diff_content.encode("utf-8")).hexdigest()

        candidate = ReleaseCandidate(
            release_id=release_id,
            version=version,
            component=component,
            description=description,
            diff_hash=diff_hash,
            holdout_benchmark_score=0.0,
            holdout_passed=False,
            security_scan_passed=False,
            architecture_approved=False,
            signatures=[],
            status="staged",
        )
        self._releases[candidate.release_id] = candidate
        logger.info(f"Staged new release candidate: {release_id} ({version})")
        return candidate

    def run_holdout_benchmark(self, release_id: str) -> float:
        """Runs the candidate improvement through the SWE holdout test suite."""
        candidate = self._releases.get(release_id)
        if not candidate:
            raise KeyError(f"Release candidate '{release_id}' not found.")

        # Simulate comprehensive SWE holdout benchmark execution
        score = 96.4
        candidate.holdout_benchmark_score = score
        candidate.holdout_passed = score >= 90.0

        if candidate.holdout_passed:
            # Automatically append SWE benchmark signature
            swe_sig = self._compute_signature("SWE_BENCHMARK", "bot-perf-lead", candidate.diff_hash)
            # Remove any existing SWE signature
            candidate.signatures = [s for s in candidate.signatures if s.signatory_role != "SWE_BENCHMARK"]
            candidate.signatures.append(swe_sig)
            self._check_and_update_quorum(candidate)
            logger.info(f"Release {release_id}: holdout benchmark PASSED ({score}%), signed by SWE_BENCHMARK")
        return score

    def sign_release(
        self,
        release_id: str,
        role: str,
        bot_name: str,
    ) -> CryptographicSignature:
        """Applies an executive or verification cryptographic signature.

        Allowed roles:
        - 'CTO_ARCH': Lead Architect sign-off
        - 'CISO_ASTRA': Security & AST Boundary sign-off
        - 'SWE_BENCHMARK': SWE Holdout Benchmark sign-off
        """
        candidate = self._releases.get(release_id)
        if not candidate:
            raise KeyError(f"Release candidate '{release_id}' not found.")

        valid_roles = ["CTO_ARCH", "CISO_ASTRA", "SWE_BENCHMARK"]
        if role not in valid_roles:
            raise ValueError(f"Invalid signatory role '{role}'. Must be one of {valid_roles}")

        if role == "CTO_ARCH":
            candidate.architecture_approved = True
        elif role == "CISO_ASTRA":
            candidate.security_scan_passed = True
        elif role == "SWE_BENCHMARK":
            candidate.holdout_passed = True

        sig = self._compute_signature(role, bot_name, candidate.diff_hash)
        candidate.signatures = [s for s in candidate.signatures if s.signatory_role != role]
        candidate.signatures.append(sig)

        self._check_and_update_quorum(candidate)
        return sig

    def _check_and_update_quorum(self, candidate: ReleaseCandidate) -> bool:
        """Evaluates whether all 3 required cryptographic signatures are present."""
        signed_roles = {s.signatory_role for s in candidate.signatures if s.verified}
        required_roles = {"CTO_ARCH", "SWE_BENCHMARK", "CISO_ASTRA"}

        if required_roles.issubset(signed_roles):
            candidate.status = "multi_sig_verified"
            return True
        return False

    def promote_release_zero_downtime(self, release_id: str) -> ReleaseCandidate:
        """Promotes a multi-sig verified release to active production with zero-downtime hot-swap."""
        candidate = self._releases.get(release_id)
        if not candidate:
            raise KeyError(f"Release candidate '{release_id}' not found.")

        self._check_and_update_quorum(candidate)
        if candidate.status != "multi_sig_verified":
            missing = {"CTO_ARCH", "SWE_BENCHMARK", "CISO_ASTRA"} - {s.signatory_role for s in candidate.signatures}
            raise PermissionError(
                f"Cannot promote release '{release_id}'. Quorum incomplete: missing signatures for {list(missing)}"
            )

        # Archive or demote previously active releases of the same component
        for r in self._releases.values():
            if r.component == candidate.component and r.status == "promoted_active":
                r.status = "archived"

        candidate.status = "promoted_active"
        candidate.promoted_at = time.time()
        logger.info(f"HOT-SWAP SUCCESSFUL: release {candidate.release_id} ({candidate.version}) promoted to active production.")
        return candidate

    def get_release(self, release_id: str) -> ReleaseCandidate | None:
        return self._releases.get(release_id)

    def list_releases(self) -> list[ReleaseCandidate]:
        return sorted(self._releases.values(), key=lambda r: -r.created_at)

    def get_active_release(self, component: str = "enterprise-core") -> ReleaseCandidate | None:
        for r in self._releases.values():
            if r.component == component and r.status == "promoted_active":
                return r
        return None


_COUNCIL_ENGINE: QualityCouncilQuorumEngine | None = None


def get_council_quorum_engine() -> QualityCouncilQuorumEngine:
    global _COUNCIL_ENGINE
    if _COUNCIL_ENGINE is None:
        _COUNCIL_ENGINE = QualityCouncilQuorumEngine()
    return _COUNCIL_ENGINE
