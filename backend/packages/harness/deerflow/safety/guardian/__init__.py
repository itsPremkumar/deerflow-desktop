"""Smart Approvals & Guardian Review engine inspired by Hermes Agent."""

from deerflow.safety.guardian.circuit_breaker import DenialCircuitBreaker, get_denial_breaker
from deerflow.safety.guardian.floors import PermanentAllowlist, get_permanent_allowlist
from deerflow.safety.guardian.smart import (
    GuardianReviewResult,
    evaluate_command_safety,
    strip_shell_comments,
)

__all__ = [
    "strip_shell_comments",
    "GuardianReviewResult",
    "evaluate_command_safety",
    "PermanentAllowlist",
    "get_permanent_allowlist",
    "DenialCircuitBreaker",
    "get_denial_breaker",
]
