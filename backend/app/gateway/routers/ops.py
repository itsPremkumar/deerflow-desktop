"""Production operations endpoints (deployment metadata and runtime status).

Sits behind the default Gateway authentication like ``/api/features``: these
routes expose no secrets, only the build/runtime metadata operators need for
deploy verification, dashboards, and monitoring gates beyond ``/health`` and
``/health/ready`` (which stay public for orchestrator probes).

* ``GET /api/ops/version`` - service name plus the installed ``deer-flow``
  package version (``"unknown"`` when package metadata is unavailable, e.g. an
  unpackaged source checkout).
* ``GET /api/ops/status`` - liveness plus process uptime, current UTC time,
  and whether the OpenAPI docs endpoints are enabled (expected ``false`` in
  production via ``GATEWAY_ENABLE_DOCS=false``).
"""

from __future__ import annotations

import time
from datetime import UTC, datetime
from importlib import metadata

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.gateway.config import get_gateway_config

router = APIRouter(prefix="/api", tags=["ops"])

_PROCESS_START_MONOTONIC = time.monotonic()


def _resolve_gateway_version() -> str:
    """Return the installed deer-flow version, or "unknown" without metadata."""
    try:
        return metadata.version("deer-flow")
    except metadata.PackageNotFoundError:
        return "unknown"


class VersionResponse(BaseModel):
    """Deployed Gateway build identity."""

    service: str = Field(..., description="Gateway service name")
    version: str = Field(..., description='Installed deer-flow version, or "unknown" without package metadata')


class StatusResponse(BaseModel):
    """Gateway runtime status for operators and monitoring."""

    service: str = Field(..., description="Gateway service name")
    status: str = Field(..., description='Always "ok" when this endpoint responds')
    uptime_seconds: int = Field(..., description="Seconds since this Gateway process started")
    time_utc: str = Field(..., description="Current server time in ISO 8601 UTC")
    docs_enabled: bool = Field(..., description="Whether /docs, /redoc and /openapi.json are exposed (false in production)")


@router.get(
    "/ops/version",
    response_model=VersionResponse,
    summary="Gateway version",
    description="Return the deployed Gateway build identity for deploy verification.",
)
async def ops_version() -> VersionResponse:
    """Return the deployed Gateway build identity."""
    return VersionResponse(service="deer-flow-gateway", version=_resolve_gateway_version())


@router.get(
    "/ops/status",
    response_model=StatusResponse,
    summary="Gateway runtime status",
    description="Return process uptime and runtime flags for operators and monitoring.",
)
async def ops_status() -> StatusResponse:
    """Return Gateway runtime status."""
    return StatusResponse(
        service="deer-flow-gateway",
        status="ok",
        uptime_seconds=int(time.monotonic() - _PROCESS_START_MONOTONIC),
        time_utc=datetime.now(UTC).isoformat(),
        docs_enabled=get_gateway_config().enable_docs,
    )
