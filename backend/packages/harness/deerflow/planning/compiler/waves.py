from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Set


@dataclass
class ExecutionWave:
    """A cohort of tasks that can be safely dispatched concurrently."""
    wave_index: int
    task_ids: List[str] = field(default_factory=list)
    parallel_allowed: bool = True
    barrier_required: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "wave_index": self.wave_index,
            "task_ids": self.task_ids,
            "parallel_allowed": self.parallel_allowed,
            "barrier_required": self.barrier_required,
        }


def partition_execution_waves(task_dag: Dict[str, List[str]]) -> List[ExecutionWave]:
    """
    P12: Partition a task dependency graph into sequential execution waves.
    task_dag: mapping of task_id -> list of dependencies (task_ids it depends on).
    """
    if not task_dag:
        return []

    # Copy dependency structure
    remaining_deps: Dict[str, Set[str]] = {
        tid: set(deps) for tid, deps in task_dag.items()
    }
    completed: Set[str] = set()
    waves: List[ExecutionWave] = []
    wave_idx = 1

    while remaining_deps:
        # Find all tasks with all dependencies satisfied
        current_wave_tasks = [
            tid
            for tid, deps in remaining_deps.items()
            if deps.issubset(completed)
        ]

        if not current_wave_tasks:
            # Dependency cycle or unresolved reference detected
            # Break cycle by taking arbitrary remaining tasks into an emergency wave
            current_wave_tasks = sorted(list(remaining_deps.keys()))[:1]

        waves.append(
            ExecutionWave(
                wave_index=wave_idx,
                task_ids=sorted(current_wave_tasks),
                parallel_allowed=len(current_wave_tasks) > 1,
                barrier_required=True,
            )
        )

        for tid in current_wave_tasks:
            completed.add(tid)
            remaining_deps.pop(tid, None)

        wave_idx += 1

    return waves
