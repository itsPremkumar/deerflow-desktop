"""Enterprise Bounded Recursive Self-Improvement Tool.

Enterprise wrapper for bounded self-improvement loops across subagent delegations.
"""

from __future__ import annotations

from typing import Annotated
from langchain.tools import InjectedToolCallId, tool
from langgraph.types import Command

from deerflow.tools.types import Runtime
from .ralph_loop_tool import (
    RALPH_DEFAULT_MAX_ROUNDS,
    RALPH_HARD_MAX_ROUNDS,
    ralph_loop_tool,
)


@tool("self_improvement_loop", parse_docstring=True)
async def self_improvement_loop_tool(
    runtime: Runtime,
    task: str,
    completion_promise: str,
    tool_call_id: Annotated[str, InjectedToolCallId],
    *,
    max_rounds: int = RALPH_DEFAULT_MAX_ROUNDS,
    subagent_type: str = "general-purpose",
    description: str = "",
) -> str | Command:
    """Run a task through bounded self-improvement rounds until a promise holds.

    Enterprise-grade autonomous loop: delegates to a subagent, evaluates
    deterministic acceptance criteria, and feeds proven shortfalls into
    iterative repair rounds until convergence or budget exhaustion.

    Args:
        task: The task description for the subagent. Be specific about what needs to be done.
        completion_promise: The done-condition, preferably in canonical
            acceptance form (`file:<path> exists|non-empty`,
            `file_written:<path>`, `tests_passed:<command>`) so it is checked
            deterministically. Non-canonical promises complete on a clean run.
        max_rounds: Maximum delegation rounds (1-8, default 3).
        subagent_type: The subagent type per round. Unknown types fail listing the available types.
        description: Optional short (3-5 word) description for logging/display.
    """
    return await ralph_loop_tool.ainvoke(
        {
            "runtime": runtime,
            "task": task,
            "completion_promise": completion_promise,
            "tool_call_id": tool_call_id,
            "max_rounds": max_rounds,
            "subagent_type": subagent_type,
            "description": description,
        }
    )


__all__ = [
    "RALPH_DEFAULT_MAX_ROUNDS",
    "RALPH_HARD_MAX_ROUNDS",
    "self_improvement_loop_tool",
    "ralph_loop_tool",
]
