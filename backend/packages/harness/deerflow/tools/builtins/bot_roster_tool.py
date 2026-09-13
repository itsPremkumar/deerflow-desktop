"""Built-in tool for managing autonomous Bot profiles and capability rosters."""

from __future__ import annotations

from typing import Literal
from langchain.tools import tool

from deerflow.bots.registry import get_bot_registry


@tool("bot_roster", parse_docstring=True)
def bot_roster_tool(
    action: Literal["list", "inspect", "create", "update_soul"],
    name: str = "",
    role: str = "",
    soul: str = "",
    display_name: str = "",
) -> str:
    """Manage the active AI Bot roster and inspect or customize bot profiles.

    Inspired by Hermes Bot Mode, upgraded with zero-config auto-provisioning
    and capability epoch fingerprinting.

    Args:
        action: Operation to perform ('list', 'inspect', 'create', 'update_soul').
        name: Name handle of the bot (e.g. 'coder', 'architect', 'secops'). Required for inspect/create/update.
        role: Specialty role of the bot (required for 'create').
        soul: Custom SOUL instructions/personality (optional for 'create', required for 'update_soul').
        display_name: Human-readable name for the bot (optional for 'create').
    """
    registry = get_bot_registry()

    if action == "list":
        bots = registry.list_bots()
        out = ["=== Autonomous AI Bot Roster ==="]
        for b in bots:
            out.append(f"- **@{b.name}** ({b.display_name}) — Role: `{b.role}` [Epoch: `{b.capability_fingerprint()}`]")
        return "\n".join(out)

    elif action == "inspect":
        if not name:
            return "Error: 'name' is required for 'inspect'."
        bot = registry.get_bot(name)
        if not bot:
            return f"Error: Bot '@{name}' not found in roster."
        return (
            f"=== Bot Profile: @{bot.name} ({bot.display_name}) ===\n"
            f"Role: {bot.role}\n"
            f"Epoch: {bot.capability_fingerprint()}\n"
            f"Toolsets: {bot.toolsets}\n"
            f"Skills: {bot.skills}\n\n"
            f"--- SOUL ---\n{bot.soul}"
        )

    elif action == "create":
        if not name:
            return "Error: 'name' is required for 'create'."
        bot = registry.get_or_create(name=name, display_name=display_name, role=role, soul=soul)
        return f"Successfully provisioned bot @{bot.name} ({bot.role}) [Epoch: {bot.capability_fingerprint()}]."

    elif action == "update_soul":
        if not name or not soul:
            return "Error: 'name' and 'soul' are required for 'update_soul'."
        bot = registry.update_bot(name, soul=soul)
        if not bot:
            return f"Error: Bot '@{name}' not found."
        return f"Updated SOUL for @{bot.name}. New capability epoch: {bot.capability_fingerprint()}."

    return f"Error: Unknown action '{action}'."
