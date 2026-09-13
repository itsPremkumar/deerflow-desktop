"""Named per-session agent presets (DeepSeek-Harness-style preset modes).

A preset is a named toolset bundle resolved per request from
``config.configurable`` / ``context`` (``agent_preset`` key) without a Gateway
restart — the same role DeepSeek Harness's ``standard`` / ``minimal`` /
``cordis`` agent presets play for Cordis profiles.

``standard`` is the identity preset (today's behavior). ``minimal`` is the
cheap two-switch preset for cost-sensitive runs (no MCP catalog, no
subagents, no clarification round-trips). Operators add their own presets via
``AppConfig.agent_presets``; unknown names warn and fall back to ``standard``.
"""

from __future__ import annotations

import logging
from collections.abc import Mapping
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

logger = logging.getLogger(__name__)

STANDARD_PRESET_NAME = "standard"
MINIMAL_PRESET_NAME = "minimal"


class AgentPresetConfig(BaseModel):
    """Config section for one named agent preset."""

    tool_groups: list[str] | None = Field(
        default=None,
        description="Tool groups bound for this preset. None keeps the custom agent's own tool_groups (or all tools for the default agent).",
    )
    include_mcp: bool = Field(
        default=True,
        description="Whether MCP tools are included for this preset.",
    )
    subagent_enabled: bool | None = Field(
        default=None,
        description="Force subagent delegation off (False) for this preset. None keeps the request value.",
    )
    disabled_tools: list[str] = Field(
        default_factory=list,
        description="Tool names removed after assembly for this preset (applied alongside the non-interactive filter).",
    )
    allow_update_agent: bool = Field(
        default=True,
        description="Whether custom agents keep the update_agent self-mutation tool under this preset.",
    )
    model_config = ConfigDict(extra="allow")


def default_presets() -> dict[str, AgentPresetConfig]:
    """Built-in presets. ``minimal`` stays group-agnostic on purpose: tool
    group names are operator-defined, so the cheap preset is expressed as
    switches (no MCP, no subagents, no clarification) rather than groups."""
    return {
        STANDARD_PRESET_NAME: AgentPresetConfig(),
        MINIMAL_PRESET_NAME: AgentPresetConfig(
            include_mcp=False,
            subagent_enabled=False,
            disabled_tools=["ask_clarification"],
        ),
    }


def resolve_agent_preset(
    name: str | None,
    *,
    presets: Mapping[str, AgentPresetConfig] | None = None,
) -> tuple[str, AgentPresetConfig]:
    """Resolve a requested preset name to ``(effective_name, config)``.

    ``None``/empty selects ``standard``. Operator presets win over built-ins;
    unknown names log a warning and fall back to ``standard`` (fail-open, so a
    typo can never break run admission).
    """
    builtin = default_presets()
    merged: dict[str, AgentPresetConfig] = dict(builtin)
    if presets:
        merged.update(presets)
    # Non-string values (e.g. a malformed client payload) fall back to
    # standard rather than raising out of assembly.
    requested = (name.strip() if isinstance(name, str) else "") or STANDARD_PRESET_NAME
    preset = merged.get(requested)
    if preset is None:
        logger.warning("Unknown agent_preset %r; falling back to %r.", requested, STANDARD_PRESET_NAME)
        return STANDARD_PRESET_NAME, merged[STANDARD_PRESET_NAME]
    return requested, preset


def preset_summary(name: str, preset: AgentPresetConfig) -> dict[str, Any]:
    """JSON-safe summary for assembly descriptors and observability."""
    return {
        "name": name,
        "tool_groups": list(preset.tool_groups) if preset.tool_groups is not None else None,
        "include_mcp": preset.include_mcp,
        "subagent_enabled": preset.subagent_enabled,
        "disabled_tools": list(preset.disabled_tools),
        "allow_update_agent": preset.allow_update_agent,
    }
