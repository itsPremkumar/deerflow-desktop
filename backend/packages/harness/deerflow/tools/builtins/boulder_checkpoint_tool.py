"""Boulder Checkpoint Tool (Sisyphus Task Continuation).

Provides tools for the agent to save and resume multi-session checkpoint progress.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from langchain.tools import tool
from deerflow.state.boulder import (
    append_session_id,
    clear_boulder,
    complete_boulder,
    create_boulder,
    load_boulder,
    update_checklist_item,
)


@tool
def boulder_checkpoint_manage(
    action: str,
    task: Optional[str] = None,
    checklist: Optional[List[str]] = None,
    step_index: Optional[int] = None,
    completed: bool = True,
    evidence: Optional[str] = None,
    session_id: Optional[str] = None,
    custom_path: Optional[str] = None,
) -> str:
    """Manage persistent Sisyphus task checkpoints. Actions: 'create', 'status', 'update_step', 'append_session', 'complete', 'clear'."""
    path = Path(custom_path) if custom_path else None

    if action == "create":
        if not task or not checklist:
            return "Error: 'task' and 'checklist' are required for create."
        state = create_boulder(task, checklist, path=path, session_id=session_id)
        return f"Created Boulder checkpoint '{state.work_id}' for task: '{task}' with {len(checklist)} steps."

    elif action == "status":
        state = load_boulder(path)
        if not state:
            return "No active Boulder checkpoint found."
        return json.dumps(state.to_dict(), indent=2)

    elif action == "update_step":
        if step_index is None:
            return "Error: 'step_index' is required for update_step."
        try:
            state = update_checklist_item(step_index, completed, evidence or "", path=path)
            return f"Updated step {step_index}. Current boulder status: '{state.status}'."
        except Exception as e:
            return f"Error: {e}"

    elif action == "append_session":
        if not session_id:
            return "Error: 'session_id' is required."
        try:
            state = append_session_id(session_id, path=path)
            return f"Appended session '{session_id}'. Lineage: {state.session_ids}."
        except Exception as e:
            return f"Error: {e}"

    elif action == "complete":
        try:
            state = complete_boulder(path=path)
            return f"Boulder '{state.work_id}' marked as completed."
        except Exception as e:
            return f"Error: {e}"

    elif action == "clear":
        clear_boulder(path=path)
        return "Cleared active Boulder checkpoint."

    return f"Error: unknown action '{action}'."
