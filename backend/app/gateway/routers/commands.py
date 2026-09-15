"""Gateway API Router for Master Slash Commands.

Exposes endpoints for:
- Querying the global Master Slash Command registry (418+ commands across 28 families)
- Category listing and counts
- Substring and capability search across commands and descriptions
- Direct command dispatch and intent resolution for the UI/Agents
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query, Request
from pydantic import BaseModel, Field

from deerflow.commands import CommandCategory, command_registry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/commands", tags=["commands"])


class CommandExecuteRequest(BaseModel):
    command: str = Field(..., min_length=1, description="Slash command line to execute, e.g. '/goal status' or '/plan'")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Optional execution context such as thread_id, agent_id, or options")


@router.get("")
async def list_commands(
    category: Optional[str] = Query(default=None, description="Filter by command category (e.g. 'core', 'mission', 'swarm')"),
    core_only: bool = Query(default=False, description="Filter only core commands"),
) -> Dict[str, Any]:
    """Lists all registered slash commands with optional category or core filter."""
    cat_enum: Optional[CommandCategory] = None
    if category:
        try:
            cat_enum = CommandCategory(category.lower())
        except ValueError:
            cat_enum = None

    commands = await asyncio.to_thread(command_registry.list_commands, category=cat_enum, only_core=core_only)
    return {
        "total": len(commands),
        "category": category,
        "core_only": core_only,
        "commands": [c.to_dict() for c in commands],
    }


@router.get("/categories")
async def get_categories() -> Dict[str, Any]:
    """Returns all 28 command categories and their command counts."""
    categories = await asyncio.to_thread(command_registry.get_categories)
    return {
        "categories": categories,
        "total_categories": len(categories),
    }


@router.get("/search")
async def search_commands(
    q: str = Query(..., min_length=1, description="Search query string"),
) -> Dict[str, Any]:
    """Searches commands by name, description, or category."""
    results = await asyncio.to_thread(command_registry.search, query=q)
    return {
        "query": q,
        "total": len(results),
        "commands": [c.to_dict() for c in results],
    }


@router.post("/execute")
async def execute_command(payload: CommandExecuteRequest) -> Dict[str, Any]:
    """Dispatches a slash command intent to the runtime."""
    result = await asyncio.to_thread(
        command_registry.execute,
        command_line=payload.command,
        context=payload.context,
    )
    return result.to_dict()
