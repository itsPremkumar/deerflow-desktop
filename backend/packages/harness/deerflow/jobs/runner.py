"""Asynchronous runner executing external OS jobs decoupled from LLM reasoning."""

from __future__ import annotations

import asyncio
import logging
import os
import time
from typing import Any

from deerflow.jobs.models import JobResult, JobSpec, JobStatus
from deerflow.jobs.queue import PersistentJobQueue

logger = logging.getLogger(__name__)


class ExternalJobRunner:
    """Manages asynchronous execution of decoupled subprocess jobs."""

    def __init__(self, queue: PersistentJobQueue | None = None):
        self._queue = queue or PersistentJobQueue()
        self._running_tasks: dict[str, asyncio.Task[Any]] = {}

    @property
    def queue(self) -> PersistentJobQueue:
        return self._queue

    async def submit_and_wait(self, spec: JobSpec) -> JobResult:
        """Submit a job to queue and await completion."""
        self._queue.enqueue(spec)
        return await self.execute_spec(spec)

    async def submit_async(self, spec: JobSpec) -> str:
        """Submit a job to queue and start background processing without awaiting completion."""
        self._queue.enqueue(spec)
        task = asyncio.create_task(self.execute_spec(spec))
        self._running_tasks[spec.job_id] = task
        # Remove from tracking once finished
        task.add_done_callback(lambda _: self._running_tasks.pop(spec.job_id, None))
        return spec.job_id

    async def execute_spec(self, spec: JobSpec) -> JobResult:
        """Execute the job specification with timeout and cancellation protection."""
        if self._queue.is_cancelled(spec.job_id):
            result = JobResult(
                job_id=spec.job_id,
                status=JobStatus.CANCELLED,
                error="Job cancelled prior to execution",
            )
            self._queue.complete_job(result)
            return result

        start_time = time.time()
        timeout = spec.resources.timeout_seconds
        working_dir = spec.working_dir or os.getcwd()

        # Merge environment variables
        env = os.environ.copy()
        if spec.env:
            env.update(spec.env)

        # Prepare command
        is_shell = isinstance(spec.command, str)
        cmd_display = spec.command if is_shell else " ".join(spec.command)
        logger.info(f"Executing external job {spec.job_id}: {cmd_display} in {working_dir}")

        try:
            if is_shell:
                proc = await asyncio.create_subprocess_shell(
                    spec.command,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=working_dir,
                    env=env,
                )
            else:
                proc = await asyncio.create_subprocess_exec(
                    spec.command[0],
                    *spec.command[1:],
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=working_dir,
                    env=env,
                )

            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(proc.communicate(), timeout=timeout)
                stdout_str = stdout_bytes.decode("utf-8", errors="replace")
                stderr_str = stderr_bytes.decode("utf-8", errors="replace")
                exit_code = proc.returncode or 0

                status = JobStatus.COMPLETED if exit_code == 0 else JobStatus.FAILED
                execution_time = time.time() - start_time

                result = JobResult(
                    job_id=spec.job_id,
                    status=status,
                    exit_code=exit_code,
                    stdout=stdout_str,
                    stderr=stderr_str,
                    execution_seconds=execution_time,
                    started_at=start_time,
                    completed_at=time.time(),
                )

            except TimeoutError:
                try:
                    proc.kill()
                    await proc.wait()
                except Exception:
                    pass

                result = JobResult(
                    job_id=spec.job_id,
                    status=JobStatus.TIMED_OUT,
                    exit_code=-1,
                    error=f"Job timed out after {timeout} seconds",
                    execution_seconds=time.time() - start_time,
                    started_at=start_time,
                    completed_at=time.time(),
                )

        except Exception as exc:
            logger.error(f"Error launching job {spec.job_id}: {exc}", exc_info=True)
            result = JobResult(
                job_id=spec.job_id,
                status=JobStatus.FAILED,
                exit_code=-1,
                error=str(exc),
                execution_seconds=time.time() - start_time,
                started_at=start_time,
                completed_at=time.time(),
            )

        self._queue.complete_job(result)
        return result

    def cancel(self, job_id: str) -> bool:
        task = self._running_tasks.get(job_id)
        if task and not task.done():
            task.cancel()
        return self._queue.cancel_job(job_id)
