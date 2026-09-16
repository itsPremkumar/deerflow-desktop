"""Bot Mode and Autonomous Persona Engine for DeerFlow."""

from deerflow.bots.epoch import CapabilityEpochManager
from deerflow.bots.events import get_org_event_store, log_org_event, query_org_events
from deerflow.bots.failure_reasons import (
    ALL_REASONS,
    AUTO_RETRYABLE,
    classify_agent_error,
    is_auto_retryable,
    is_valid_agent_name,
)
from deerflow.bots.handoff import TaskHandoffPackage, escalate_task, execute_handoff, resolve_succession
from deerflow.bots.health import BotHealthMonitor, get_health_monitor
from deerflow.bots.inbox import BotInbox, DMMessage, get_bot_inbox
from deerflow.bots.dm import (
    MESSAGE_AGENT_TOOL_NAME,
    PROTOCOL_MARKER,
    apply_attribution,
    backfill_roster_profiles,
    build_bot_roster_reminder,
    build_roster_snippet,
    canonical_bot_chat_id,
    ensure_messaging_section,
    is_bot_chat_context,
    message_agent_tool_schema,
    messaging_protocol_section,
    parse_dm_target,
    resolve_runtime_bot_name,
    send_dm,
)
from deerflow.bots.kill_switch import (
    get_kill_switch_status,
    is_bot_paused,
    is_kill_switch_active,
    pause_bot,
    resume_bot,
    set_global_kill_switch,
)
from deerflow.bots.organization import generate_organization_for_goal, get_organization_chart
from deerflow.bots.ephemeral import EphemeralBotManager, EphemeralLease, get_ephemeral_manager
from deerflow.bots.permissions import ROLE_PERMISSION_RINGS, ToolPermissionGate, get_permission_gate
from deerflow.bots.profile import BotProfile, generate_default_soul
from deerflow.bots.quality_gate import evaluate_quality_gate
from deerflow.bots.registry import BotRegistry, get_bot_registry
from deerflow.bots.templates import BOT_STATUSES, BOT_TEMPLATES, DEPARTMENTS, get_template, list_templates
from deerflow.bots.work_discovery import claim_task, match_bot_for_task

__all__ = [
    "EphemeralBotManager",
    "EphemeralLease",
    "get_ephemeral_manager",
    "ToolPermissionGate",
    "ROLE_PERMISSION_RINGS",
    "get_permission_gate",
    "BotProfile",
    "generate_default_soul",
    "BotRegistry",
    "get_bot_registry",
    "CapabilityEpochManager",
    "BOT_TEMPLATES",
    "BOT_STATUSES",
    "DEPARTMENTS",
    "get_template",
    "list_templates",
    "BotHealthMonitor",
    "get_health_monitor",
    "get_organization_chart",
    "generate_organization_for_goal",
    "TaskHandoffPackage",
    "execute_handoff",
    "resolve_succession",
    "escalate_task",
    "BotInbox",
    "DMMessage",
    "get_bot_inbox",
    "MESSAGE_AGENT_TOOL_NAME",
    "PROTOCOL_MARKER",
    "apply_attribution",
    "backfill_roster_profiles",
    "build_bot_roster_reminder",
    "build_roster_snippet",
    "canonical_bot_chat_id",
    "ensure_messaging_section",
    "is_bot_chat_context",
    "message_agent_tool_schema",
    "messaging_protocol_section",
    "parse_dm_target",
    "resolve_runtime_bot_name",
    "send_dm",
    "ALL_REASONS",
    "AUTO_RETRYABLE",
    "classify_agent_error",
    "is_auto_retryable",
    "is_valid_agent_name",
    "match_bot_for_task",
    "claim_task",
    "record_task_outcome",
    "get_bot_performance",
    "evaluate_quality_gate",
    "set_global_kill_switch",
    "is_kill_switch_active",
    "pause_bot",
    "resume_bot",
    "is_bot_paused",
    "get_kill_switch_status",
    "get_org_event_store",
    "log_org_event",
    "query_org_events",
]
