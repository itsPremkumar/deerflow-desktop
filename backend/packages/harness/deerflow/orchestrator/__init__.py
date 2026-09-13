"""Core orchestrator additions (OpenClaw 2.0-inspired), additive-only.

This package unifies 15 advanced orchestrator capabilities on top of the
existing DeerFlow harness modules. It never replaces existing owners:

- context engine -> wraps deerflow.context.engine.ContextEngine
- provider routing -> builds on deerflow.models.fallback / failover
- approvals -> new custody store, consumed by guardrails/authz
- secrets -> resolves secretRef:// on top of runtime.secret_context
- durable tasks / automations / governor -> wraps runtime.runs + scheduler
- memory recall / dreaming trigger -> wraps memory.dreaming + active_memory
- sessions catalog -> sqlite-backed thread bindings + branch/rewind helpers
- tracing -> re-exports deerflow.trace_context with subagent/memory helpers
- acp binding -> thread-scoped ACP agent registry
"""

from deerflow.orchestrator.acp_binding import AcpBindingRegistry, get_acp_registry
from deerflow.orchestrator.approvals import ApprovalCustodyStore, ApprovalDecision, get_approval_store
from deerflow.orchestrator.automations import AutomationDefinition, AutomationScheduler
from deerflow.orchestrator.context_engine_plugin import ContextEnginePlugin, get_context_engine_plugin
from deerflow.orchestrator.durable_tasks import (
    ConcurrencyGovernor,
    DedupeCache,
    DeliveryQueue,
    DurableTaskRecord,
    DurableTaskRuntime,
    TokenBudgetGovernor,
)
from deerflow.orchestrator.memory_recall import CrossThreadRecallConfig, trigger_dream_cycle
from deerflow.orchestrator.provider_routing import (
    ChannelModelOverride,
    UtilityModelRouter,
    build_fallback_chain,
)
from deerflow.orchestrator.secrets import is_secret_ref, resolve_secret_refs
from deerflow.orchestrator.sessions import SessionCatalog, SessionRecord
from deerflow.orchestrator.tracing import bind_trace_for_subagent, propagate_trace_to_memory

__all__ = [
    "AcpBindingRegistry",
    "ApprovalCustodyStore",
    "ApprovalDecision",
    "AutomationDefinition",
    "AutomationScheduler",
    "ChannelModelOverride",
    "ConcurrencyGovernor",
    "ContextEnginePlugin",
    "CrossThreadRecallConfig",
    "DeliveryQueue",
    "DedupeCache",
    "DurableTaskRecord",
    "DurableTaskRuntime",
    "SessionCatalog",
    "SessionRecord",
    "TokenBudgetGovernor",
    "UtilityModelRouter",
    "bind_trace_for_subagent",
    "build_fallback_chain",
    "get_acp_registry",
    "get_approval_store",
    "get_context_engine_plugin",
    "is_secret_ref",
    "propagate_trace_to_memory",
    "resolve_secret_refs",
    "trigger_dream_cycle",
]
