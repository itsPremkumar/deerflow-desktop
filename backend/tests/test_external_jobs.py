"""Comprehensive tests for the Decoupled External Job Engine."""

from __future__ import annotations

import asyncio
import sys

import pytest

from deerflow.jobs import (
    ExternalJobRunner,
    JobPriority,
    JobSpec,
    JobStatus,
    PersistentJobQueue,
)
from deerflow.tools.builtins.job_tool import job_tool


def test_job_queue_priority_ordering():
    queue = PersistentJobQueue(max_concurrency=2)
    spec_normal = JobSpec(title="Normal Task", command=["echo", "normal"], priority=JobPriority.NORMAL)
    spec_critical = JobSpec(title="Critical Task", command=["echo", "critical"], priority=JobPriority.CRITICAL)
    spec_low = JobSpec(title="Low Task", command=["echo", "low"], priority=JobPriority.LOW)
    spec_high = JobSpec(title="High Task", command=["echo", "high"], priority=JobPriority.HIGH)

    queue.enqueue(spec_normal)
    queue.enqueue(spec_critical)
    queue.enqueue(spec_low)
    queue.enqueue(spec_high)

    # Dequeue order should strictly follow priority: CRITICAL -> HIGH -> NORMAL -> LOW
    first = queue.dequeue_next()
    assert first is not None
    assert first.job_id == spec_critical.job_id

    second = queue.dequeue_next()
    assert second is not None
    assert second.job_id == spec_high.job_id


@pytest.mark.asyncio
async def test_job_runner_successful_execution():
    runner = ExternalJobRunner()
    # Cross-platform python command to echo hello
    cmd = [sys.executable, "-c", "print('hello from external job')"]
    spec = JobSpec(title="Echo Test", command=cmd)

    result = await runner.submit_and_wait(spec)
    assert result.status == JobStatus.COMPLETED
    assert result.exit_code == 0
    assert "hello from external job" in result.stdout
    assert result.execution_seconds >= 0.0


@pytest.mark.asyncio
async def test_job_runner_timeout():
    runner = ExternalJobRunner()
    # Command that sleeps longer than timeout
    cmd = [sys.executable, "-c", "import time; time.sleep(5)"]
    spec = JobSpec(title="Sleep Test", command=cmd)
    spec.resources.timeout_seconds = 0.5

    result = await runner.submit_and_wait(spec)
    assert result.status == JobStatus.TIMED_OUT
    assert "timed out" in (result.error or "").lower()


@pytest.mark.asyncio
async def test_job_runner_cancellation():
    queue = PersistentJobQueue()
    runner = ExternalJobRunner(queue=queue)
    cmd = [sys.executable, "-c", "import time; time.sleep(5)"]
    spec = JobSpec(title="Cancel Test", command=cmd)

    job_id = await runner.submit_async(spec)
    assert runner.cancel(job_id) is True

    # Allow cancellation to propagate
    await asyncio.sleep(0.1)
    status = queue.get_status(job_id)
    assert status is not None
    assert status.status == JobStatus.CANCELLED


def test_job_tool_invocation():
    # 1. Submit job
    submit_out = job_tool.invoke(
        {
            "action": "submit",
            "command": f"{sys.executable} -c \"print('tool test')\"",
            "priority": "high",
        }
    )
    assert "job_submitted" in submit_out
    assert "job-" in submit_out

    # 2. List jobs
    list_out = job_tool.invoke({"action": "list"})
    assert "job-" in list_out


@pytest.mark.asyncio
async def test_gateway_jobs_router():
    from app.gateway.routers import jobs as jobs_router

    # Submit job via router
    req = jobs_router.JobSubmitRequest(
        title="Router Job Test",
        command=[sys.executable, "-c", "print('gateway job')"],
        priority="critical",
    )
    resp = await jobs_router.submit_job(req)
    assert resp["status"] == "queued"
    job_id = resp["job_id"]

    # Wait briefly for background execution
    await asyncio.sleep(0.5)

    # Get status
    status_resp = await jobs_router.get_job_status(job_id)
    assert status_resp["job_id"] == job_id

    # Get logs
    logs_resp = await jobs_router.get_job_logs(job_id)
    assert "job_id" in logs_resp
