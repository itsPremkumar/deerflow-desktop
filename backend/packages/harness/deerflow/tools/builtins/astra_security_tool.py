"""Built-in OpenAI Astra Security tool."""

from __future__ import annotations

import json
from typing import Any, Dict, Optional
from langchain.tools import tool

from deerflow.security.astra import (
    BoundaryViolationError,
    CheckpointCrypto,
    CheckpointIntegrityError,
    CredentialRedactor,
    DeceptionWatchdog,
    ScopedCredentialVault,
    TaskBoundaryPolicy,
    TrajectoryFlightRecorder,
)

_BOUNDARY = TaskBoundaryPolicy()
_CRYPTO = CheckpointCrypto()
_FLIGHT_RECORDER = TrajectoryFlightRecorder()
_CREDENTIAL_VAULT = ScopedCredentialVault()
_REDACTOR = CredentialRedactor()


@tool("astra_security_manage", parse_docstring=True)
def astra_security_manage(
    action: str,
    path: str = "",
    url_or_host: str = "",
    payload_json: str = "{}",
    encrypted_blob: str = "",
    actor: str = "agent",
    telemetry_action: str = "",
    service_name: str = "",
    scopes_csv: str = "read",
    raw_text: str = "",
    agent_statement: str = "",
    tool_output: str = "",
    exit_code: int = 0,
) -> str:
    """Manage OpenAI Astra security controls, boundaries, encrypted checkpoints, and telemetry.

    Args:
        action: 'check_path', 'check_network', 'encrypt_checkpoint', 'decrypt_checkpoint', 'log_telemetry', 'verify_telemetry', 'issue_credential', 'redact_text', 'audit_deception'.
        path: File/directory path to check against boundary enclaves.
        url_or_host: Target domain/URL to check against outbound whitelist.
        payload_json: JSON data to encrypt for checkpoint.
        encrypted_blob: Base64 AES-GCM ciphertext to decrypt.
        actor: Name of actor for telemetry recording.
        telemetry_action: Action name for telemetry recording.
        service_name: Service name for scoped credential lease.
        scopes_csv: Comma-separated scopes for credential lease (e.g. 'repo:read,build').
        raw_text: Text to scrub secrets from.
        agent_statement: Agent's claim to audit for deception.
        tool_output: Actual command/tool output to verify against agent claim.
        exit_code: Exit code of command.
    """
    if action == "check_path":
        try:
            resolved = _BOUNDARY.validate_path(path)
            return json.dumps({"status": "allowed", "resolved_path": resolved}, indent=2)
        except BoundaryViolationError as e:
            return json.dumps({"status": "blocked", "error": str(e)}, indent=2)

    elif action == "check_network":
        try:
            allowed = _BOUNDARY.validate_network_target(url_or_host)
            return json.dumps({"status": "allowed" if allowed else "unlisted_domain", "target": url_or_host}, indent=2)
        except BoundaryViolationError as e:
            return json.dumps({"status": "blocked", "error": str(e)}, indent=2)

    elif action == "encrypt_checkpoint":
        try:
            data = json.loads(payload_json)
        except Exception:
            data = {"raw": payload_json}
        b64 = _CRYPTO.encrypt_json(data)
        return json.dumps({"status": "encrypted", "cipher_b64": b64}, indent=2)

    elif action == "decrypt_checkpoint":
        try:
            obj = _CRYPTO.decrypt_json(encrypted_blob)
            return json.dumps({"status": "decrypted", "data": obj}, indent=2)
        except CheckpointIntegrityError as e:
            return json.dumps({"status": "corrupted_or_tampered", "error": str(e)}, indent=2)

    elif action == "log_telemetry":
        try:
            details = json.loads(payload_json) if payload_json else {}
        except Exception:
            details = {}
        entry = _FLIGHT_RECORDER.record_step(actor=actor, action=telemetry_action, details=details)
        return json.dumps({"status": "logged", "entry": entry.to_dict()}, indent=2)

    elif action == "verify_telemetry":
        valid, bad_idx = _FLIGHT_RECORDER.verify_integrity()
        return json.dumps({
            "chain_valid": valid,
            "corrupted_step": bad_idx,
            "total_steps": len(_FLIGHT_RECORDER.entries),
        }, indent=2)

    elif action == "issue_credential":
        scopes = [s.strip() for s in scopes_csv.split(",") if s.strip()]
        lease = _CREDENTIAL_VAULT.issue_lease(service_name=service_name, scopes=scopes)
        return json.dumps({"status": "issued", "lease": lease.to_dict()}, indent=2)

    elif action == "redact_text":
        clean = _REDACTOR.redact(raw_text)
        return json.dumps({"redacted_text": clean}, indent=2)

    elif action == "audit_deception":
        deceptive, msg = DeceptionWatchdog.audit_step(
            agent_statement=agent_statement,
            tool_action="audit",
            tool_output=tool_output,
            exit_code=exit_code,
        )
        return json.dumps({
            "is_deceptive": deceptive,
            "diagnostic": msg,
        }, indent=2)

    else:
        return json.dumps({
            "error": f"Unknown action '{action}'."
        }, indent=2)
