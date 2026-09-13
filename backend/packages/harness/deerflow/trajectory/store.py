"""SQLite Trajectory and Step Audit Storage Engine."""

from __future__ import annotations

import json
import logging
import sqlite3
import threading
from pathlib import Path
from typing import Any
from uuid import uuid4

from deerflow.trajectory.models import StepRecord, TrajectoryTrace, _now

logger = logging.getLogger(__name__)

_DEFAULT_TRAJECTORY_DB = ".deerflow/trajectory/audit.db"


class TrajectoryStore:
    """Thread-safe SQLite store for recording and replaying autonomous execution steps."""

    def __init__(self, db_path: str | Path | None = None):
        self.db_path = Path(db_path).resolve() if db_path else Path.cwd() / _DEFAULT_TRAJECTORY_DB
        self._lock = threading.Lock()
        self._init_db()

    def _init_db(self) -> None:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._lock, sqlite3.connect(str(self.db_path)) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS trajectory_steps (
                    step_id TEXT PRIMARY KEY,
                    goal_id TEXT NOT NULL,
                    step_index INTEGER NOT NULL,
                    thought TEXT,
                    tool_name TEXT,
                    tool_input TEXT,
                    tool_output TEXT,
                    milestone_id TEXT,
                    status TEXT,
                    error TEXT,
                    created_at TEXT
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_trajectory_goal ON trajectory_steps(goal_id, step_index)"
            )
            conn.commit()

    def record_step(
        self,
        goal_id: str,
        step_index: int,
        thought: str = "",
        tool_name: str = "",
        tool_input: dict[str, Any] | None = None,
        tool_output: str = "",
        milestone_id: str = "",
        status: str = "success",
        error: str = "",
    ) -> StepRecord:
        step_id = f"step_{uuid4().hex[:8]}"
        step = StepRecord(
            step_id=step_id,
            goal_id=goal_id,
            step_index=step_index,
            thought=thought,
            tool_name=tool_name,
            tool_input=tool_input or {},
            tool_output=tool_output,
            milestone_id=milestone_id,
            status=status,
            error=error,
        )

        with self._lock, sqlite3.connect(str(self.db_path)) as conn:
            conn.execute(
                """
                INSERT INTO trajectory_steps (
                    step_id, goal_id, step_index, thought, tool_name,
                    tool_input, tool_output, milestone_id, status, error, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    step.step_id,
                    step.goal_id,
                    step.step_index,
                    step.thought,
                    step.tool_name,
                    json.dumps(step.tool_input),
                    step.tool_output,
                    step.milestone_id,
                    step.status,
                    step.error,
                    step.created_at,
                ),
            )
            conn.commit()

        return step

    def get_trajectory(self, goal_id: str) -> TrajectoryTrace:
        with self._lock, sqlite3.connect(str(self.db_path)) as conn:
            cur = conn.execute(
                """
                SELECT step_id, goal_id, step_index, thought, tool_name,
                       tool_input, tool_output, milestone_id, status, error, created_at
                FROM trajectory_steps
                WHERE goal_id = ?
                ORDER BY step_index ASC
                """,
                (goal_id,),
            )
            rows = cur.fetchall()

        steps: list[StepRecord] = []
        for r in rows:
            try:
                inp = json.loads(r[5]) if r[5] else {}
            except Exception:
                inp = {}
            steps.append(
                StepRecord(
                    step_id=r[0],
                    goal_id=r[1],
                    step_index=r[2],
                    thought=r[3] or "",
                    tool_name=r[4] or "",
                    tool_input=inp,
                    tool_output=r[6] or "",
                    milestone_id=r[7] or "",
                    status=r[8] or "success",
                    error=r[9] or "",
                    created_at=r[10] or "",
                )
            )

        return TrajectoryTrace(goal_id=goal_id, steps=steps, total_steps=len(steps))

    def export_jsonl(self, goal_id: str, output_file: str | Path) -> str:
        trace = self.get_trajectory(goal_id)
        out_path = Path(output_file).resolve()
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            for s in trace.steps:
                f.write(json.dumps(s.to_dict()) + "\n")
        return str(out_path)

    def list_goal_ids(self) -> list[str]:
        with self._lock, sqlite3.connect(str(self.db_path)) as conn:
            cur = conn.execute("SELECT DISTINCT goal_id FROM trajectory_steps ORDER BY created_at DESC")
            return [r[0] for r in cur.fetchall()]


_global_trajectory_store = TrajectoryStore()


def get_trajectory_store() -> TrajectoryStore:
    return _global_trajectory_store
