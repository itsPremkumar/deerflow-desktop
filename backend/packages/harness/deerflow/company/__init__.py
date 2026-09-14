"""Autonomous AI Company & Perpetual Organization OS package."""

from deerflow.company.archetypes import (
    ArchetypeDefinition,
    detect_archetype_from_prompt,
    get_open_source_archetype,
    get_research_lab_archetype,
    get_security_soc_archetype,
    synthesize_custom_archetype,
)
from deerflow.company.attendance import AttendanceLedgerEngine, AttendanceStatus, BotHeartbeat
from deerflow.company.bot_medic import BotMedicEngine, HealingReport
from deerflow.company.discovery import ContinuousWorkDiscoveryEngine
from deerflow.company.executive import ExecutiveDigest, ExecutiveIntelligenceLayer
from deerflow.company.group_chat import GroupChannel, GroupChatEngine, GroupMessage, GroupMessageType
from deerflow.company.hermes_bridge import HermesBotMetadata, HermesLocalBridge
from deerflow.company.hermes_kanban import HermesKanbanAdapter
from deerflow.company.kanban import (
    CompanyKanbanEngine,
    KanbanActivityLog,
    KanbanTask,
    TaskPriority,
    TaskStatus,
)
from deerflow.company.kpi import KPIEngine
from deerflow.company.models import (
    CompanyCharter,
    CompanyProject,
    CompanyState,
    DepartmentSpec,
    DepartmentType,
    DiscoveredWorkItem,
    EvolutionRecord,
    KPISpec,
    OrgArchetype,
    OrgState,
    ResponsibilityBinding,
    StrategicObjective,
    WorkCategory,
    WorkPriority,
)
from deerflow.company.organization import (
    AutonomousCompanyEngine,
    get_autonomous_company_engine,
)
from deerflow.company.production_line import (
    ProductionLineEngine,
    ProductionLineRun,
    ProductionStage,
    StageArtifact,
)
from deerflow.company.responsibility import ResponsibilityEngine
from deerflow.company.self_improvement import ContinuousSelfImprovementEngine
from deerflow.company.strategy import StrategicPlanningEngine, StrategyReplanReport

__all__ = [
    "OrgState",
    "OrgArchetype",
    "DepartmentType",
    "WorkCategory",
    "WorkPriority",
    "CompanyCharter",
    "DepartmentSpec",
    "ResponsibilityBinding",
    "StrategicObjective",
    "CompanyProject",
    "DiscoveredWorkItem",
    "KPISpec",
    "EvolutionRecord",
    "CompanyState",
    "ExecutiveDigest",
    "ExecutiveIntelligenceLayer",
    "StrategyReplanReport",
    "StrategicPlanningEngine",
    "ContinuousWorkDiscoveryEngine",
    "KPIEngine",
    "ResponsibilityEngine",
    "ContinuousSelfImprovementEngine",
    "AutonomousCompanyEngine",
    "get_autonomous_company_engine",
    "ArchetypeDefinition",
    "detect_archetype_from_prompt",
    "get_open_source_archetype",
    "get_security_soc_archetype",
    "get_research_lab_archetype",
    "synthesize_custom_archetype",
    "HermesBotMetadata",
    "HermesLocalBridge",
    "ProductionStage",
    "StageArtifact",
    "ProductionLineRun",
    "ProductionLineEngine",
    "HermesKanbanAdapter",
    "GroupChannel",
    "GroupMessage",
    "GroupMessageType",
    "GroupChatEngine",
    "AttendanceStatus",
    "BotHeartbeat",
    "AttendanceLedgerEngine",
    "HealingReport",
    "BotMedicEngine",
    "KanbanTask",
    "KanbanActivityLog",
    "CompanyKanbanEngine",
    "TaskStatus",
    "TaskPriority",
]
