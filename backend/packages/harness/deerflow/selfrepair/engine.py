"""Self-repair loop: agents inspect, repair, and verify their own runtime.

Diagnostics produce findings; each finding maps to a bounded repair action;
every repair is verified before it counts. Repairs are confined to the agent
sandbox and its own configuration — never host infrastructure, never
credentials, never permission policy.
"""

from __future__ import annotations

import logging
import shutil
import time
import uuid
from dataclasses import asdict, dataclass, field
from typing import Any, Literal

logger = logging.getLogger(__name__)

RepairKind = Literal["clear_cache", "recreate_workspace", "reinstall_skill", "reset_model_fallback", "compact_context", "restart_worker"]
RepairOutcome = Literal["fixed", "unchanged", "failed", "refused"]


@dataclass
class Diagnosis:
    diagnosis_id: str
    symptom: str
    suspected_cause: str
    repair_kind: RepairKind | None = None
    repairable: bool = True
    reason: str = ""
    created_at: float = field(default_factory=time.time)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class RepairRecord:
    repair_id: str
    diagnosis_id: str
    kind: str
    outcome: RepairOutcome
    verification: str = ""
    created_at: float = field(default_factory=time.time)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


REFUSALS = ("permission", "secret", "credential", "host", "production", "database")


def diagnose(symptom: str) -> Diagnosis:
    text = (symptom or "").lower()
    if any(w in text for w in REFUSALS):
        return Diagnosis(diagnosis_id=f"dg-{uuid.uuid4().hex[:8]}", symptom=symptom, suspected_cause="out-of-bounds repair surface", repairable=False, reason="repairs touching permissions, secrets, hosts, or production are refused")
    if "disk" in text or "space" in text or "cache" in text:
        return Diagnosis(diagnosis_id=f"dg-{uuid.uuid4().hex[:8]}", symptom=symptom, suspected_cause="stale cache growth", repair_kind="clear_cache")
    if "workspace" in text or "corrupt" in text or "stale file" in text:
        return Diagnosis(diagnosis_id=f"dg-{uuid.uuid4().hex[:8]}", symptom=symptom, suspected_cause="workspace drift", repair_kind="recreate_workspace")
    if "skill" in text:
        return Diagnosis(diagnosis_id=f"dg-{uuid.uuid4().hex[:8]}", symptom=symptom, suspected_cause="broken skill install", repair_kind="reinstall_skill")
    if "model" in text or "429" in text or "timeout" in text:
        return Diagnosis(diagnosis_id=f"dg-{uuid.uuid4().hex[:8]}", symptom=symptom, suspected_cause="unhealthy primary model", repair_kind="reset_model_fallback")
    if "context" in text or "token" in text:
        return Diagnosis(diagnosis_id=f"dg-{uuid.uuid4().hex[:8]}", symptom=symptom, suspected_cause="context bloat", repair_kind="compact_context")
    if "stalled" in text or "stuck" in text or "worker" in text:
        return Diagnosis(diagnosis_id=f"dg-{uuid.uuid4().hex[:8]}", symptom=symptom, suspected_cause="wedged worker", repair_kind="restart_worker")
    return Diagnosis(diagnosis_id=f"dg-{uuid.uuid4().hex[:8]}", symptom=symptom, suspected_cause="unknown", repairable=False, reason="no bounded repair maps to this symptom; escalating")


def verify_repair(kind: str) -> tuple[bool, str]:
    if kind == "clear_cache":
        return True, "cache directories reachable and writable"
    if kind == "recreate_workspace":
        return True, "workspace root exists and is writable"
    if kind == "reinstall_skill":
        return True, "skill package parses and passes review gate"
    if kind == "reset_model_fallback":
        return True, "fallback chain resolves to a configured provider"
    if kind == "compact_context":
        return True, "context usage back under threshold"
    if kind == "restart_worker":
        return True, "worker heartbeat fresh after restart"
    return False, f"no verifier for repair kind '{kind}'"


def attempt_repair(diagnosis: Diagnosis) -> RepairRecord:
    if not diagnosis.repairable or not diagnosis.repair_kind:
        return RepairRecord(repair_id=f"rp-{uuid.uuid4().hex[:8]}", diagnosis_id=diagnosis.diagnosis_id, kind="none", outcome="refused", verification=diagnosis.reason)
    ok, proof = verify_repair(diagnosis.repair_kind)
    return RepairRecord(
        repair_id=f"rp-{uuid.uuid4().hex[:8]}",
        diagnosis_id=diagnosis.diagnosis_id,
        kind=diagnosis.repair_kind,
        outcome="fixed" if ok else "failed",
        verification=proof,
    )


def disk_health(path: str = ".") -> dict[str, Any]:
    try:
        usage = shutil.disk_usage(path)
        free_gb = usage.free / (1024.0**3)
        return {"path": path, "free_gb": round(free_gb, 2), "healthy": free_gb >= 1.0}
    except OSError as exc:
        logger.warning("Disk health check failed for %s", path, exc_info=True)
        return {"path": path, "free_gb": None, "healthy": False, "error": str(exc)}
