"""Autonomous Agent Swarm Subsystem for DeerFlow 2.0.

Provides critical-path-optimized swarm decomposition, dependency DAGs,
hybrid workforce scheduling (Permanent Specialist Bots + Ephemeral Subagents),
background async execution, tri-tier memory, rate-limit governance,
autonomous triggers, and automated succession incident recovery.
"""

from deerflow.swarm.aggregator import SwarmAggregator
from deerflow.swarm.coordinator import SwarmCoordinator, get_swarm_coordinator
from deerflow.swarm.decomposer import SwarmTaskDecomposer
from deerflow.swarm.estimator import SwarmBenefitEstimator
from deerflow.swarm.governor import SwarmResourceGovernor, get_swarm_resource_governor
from deerflow.swarm.incidents import (
    SwarmIncident,
    SwarmIncidentManager,
    get_swarm_incident_manager,
)
from deerflow.swarm.memory import SwarmMemoryManager, get_swarm_memory_manager
from deerflow.swarm.models import (
    SwarmDecision,
    SwarmEvent,
    SwarmMode,
    SwarmPlan,
    SwarmTaskNode,
    TaskNodeState,
)
from deerflow.swarm.runner import AsyncSwarmRunner
from deerflow.swarm.scheduler import SwarmScheduler
from deerflow.swarm.triggers import AutonomousWorkTrigger
from deerflow.swarm.watchdog import SwarmWatchdog
from deerflow.swarm.worker import (
    CodingWorktreeWorker,
    EphemeralSubagentWorker,
    HermesBotWorker,
    SpecialistBotWorker,
    SwarmWorkerBackend,
)

__all__ = [
    "AsyncSwarmRunner",
    "AutonomousWorkTrigger",
    "CodingWorktreeWorker",
    "EphemeralSubagentWorker",
    "HermesBotWorker",
    "SpecialistBotWorker",
    "SwarmAggregator",
    "SwarmCoordinator",
    "SwarmDecision",
    "SwarmEvent",
    "SwarmIncident",
    "SwarmIncidentManager",
    "SwarmMemoryManager",
    "SwarmMode",
    "SwarmPlan",
    "SwarmResourceGovernor",
    "SwarmScheduler",
    "SwarmTaskDecomposer",
    "SwarmTaskNode",
    "SwarmWatchdog",
    "SwarmWorkerBackend",
    "TaskNodeState",
    "SwarmBenefitEstimator",
    "get_swarm_coordinator",
    "get_swarm_incident_manager",
    "get_swarm_memory_manager",
    "get_swarm_resource_governor",
]
