"""Gateway REST Router for Decoupled External Jobs."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from deerflow.jobs import (
    JobPriority,
    JobSpec,
    JobStatus,
    PersistentJobQueue,
)
from deerflow.jobs.runner import ExternalJobRunner

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/jobs", tags=["jobs"])

_GLOBAL_QUEUE = PersistentJobQueue(max_concurrency=4)
_GLOBAL_RUNNER = ExternalJobRunner(queue=_GLOBAL_QUEUE)


class JobSubmitRequest(BaseModel):
    command: list[str] | str = Field(..., description="Executable command or shell string")
    title: str = Field(default="Background Task", description="Human-readable job label")
    working_dir: str | None = Field(default=None, description="Working directory path")
    env: dict[str, str] = Field(default_factory=dict, description="Environment variables")
    priority: str = Field(default="normal", description="Priority: critical, high, normal, low")
    timeout_seconds: float = Field(default=300.0, description="Hard timeout in seconds")
    tags: list[str] = Field(default_factory=list, description="Categorization tags")


@router.post("")
async def submit_job(payload: JobSubmitRequest):
    """Submits a decoupled background job for execution."""
    p_enum = JobPriority.NORMAL
    try:
        p_enum = JobPriority(payload.priority.lower().strip())
    except ValueError:
        pass

    spec = JobSpec(
        title=payload.title,
        command=payload.command,
        working_dir=payload.working_dir,
        env=payload.env,
        priority=p_enum,
        tags=payload.tags,
    )
    spec.resources.timeout_seconds = payload.timeout_seconds

    job_id = await _GLOBAL_RUNNER.submit_async(spec)
    return {
        "status": "queued",
        "job_id": job_id,
        "title": spec.title,
        "priority": spec.priority.value,
        "timeout_seconds": spec.resources.timeout_seconds,
    }


@router.get("")
async def list_jobs(status: str | None = None, tag: str | None = None, limit: int = 50):
    """Lists registered background jobs with optional status/tag filtering."""
    s_enum = None
    if status:
        try:
            s_enum = JobStatus(status.lower().strip())
        except ValueError:
            pass
    jobs = _GLOBAL_QUEUE.list_jobs(status=s_enum, tag=tag, limit=limit)
    return [j.model_dump() for j in jobs]


@router.get("/{job_id}")
async def get_job_status(job_id: str):
    """Retrieves status and metadata of a specific job."""
    res = _GLOBAL_QUEUE.get_status(job_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    return res.model_dump()


@router.get("/{job_id}/logs")
async def get_job_logs(job_id: str):
    """Retrieves stdout/stderr outputs for a specific job."""
    res = _GLOBAL_QUEUE.get_status(job_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    return {
        "job_id": job_id,
        "status": res.status.value,
        "exit_code": res.exit_code,
        "stdout": res.stdout,
        "stderr": res.stderr,
        "execution_seconds": res.execution_seconds,
    }


@router.post("/{job_id}/cancel")
async def cancel_job(job_id: str):
    """Cancels a queued or currently executing background job."""
    cancelled = _GLOBAL_RUNNER.cancel(job_id)
    if not cancelled:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found or already finished.")
    return {"status": "cancelled", "job_id": job_id}
