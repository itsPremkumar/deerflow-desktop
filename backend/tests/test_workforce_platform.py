"""Skill tiers, delivery ledger, project rooms, channel catalog, route mounts."""

from __future__ import annotations

import pytest

from deerflow.scheduler.delivery import DeliveryLedger
from deerflow.skills.tiers import TierRegistry


@pytest.fixture()
def tiers(tmp_path):
    return TierRegistry(storage_path=tmp_path / "tiers.json")


@pytest.fixture()
def ledger(tmp_path):
    return DeliveryLedger(storage_path=tmp_path / "delivery.json")


def test_skill_quarantine_graduate_lifecycle(tiers):
    assert tiers.loadable("fresh-skill") is False
    tiers.quarantine("fresh-skill")
    assert tiers.loadable("fresh-skill") is False
    assert tiers.graduate("fresh-skill", reviewer="operator").tier == "trusted"
    assert tiers.loadable("fresh-skill") is True
    assert tiers.loadable("fresh-skill", min_tier="builtin") is False
    assert tiers.graduate("ghost", reviewer="operator") is None


def test_delivery_ledger_exactly_once(ledger):
    rec, is_new = ledger.claim("task-1", "occ-1")
    assert is_new is True and rec.status == "pending"
    same, is_new = ledger.claim("task-1", "occ-1")
    assert is_new is False and same.delivery_id == rec.delivery_id
    marked = ledger.mark("occ-1", "delivered", artifact_ref="report.md", channel="web")
    assert marked is not None and marked.status == "delivered" and marked.attempts == 1
    again = ledger.mark("occ-1", "delivered")
    assert again is not None and again.attempts == 1
    assert ledger.mark("occ-missing", "delivered") is None
    assert len(ledger.pending()) == 0


def test_project_rooms_solo_vs_team(tmp_path):
    from deerflow.groups.service import GroupChatService

    svc = GroupChatService(storage_path=tmp_path / "rooms.json")
    assert svc.get_or_create_project_room("proj-solo", ["coder"]) is None
    assert svc.get_or_create_project_room("proj-empty", []) is None
    room = svc.get_or_create_project_room("proj-team", ["coder", "reviewer"])
    assert room is not None and room.project_id == "proj-team"
    again = svc.get_or_create_project_room("proj-team", ["coder", "reviewer", "tester"])
    assert again is not None and again.room_id == room.room_id
    assert "tester" in again.members
    assert len(svc.rooms_for_project("proj-team")) == 1


def test_channel_catalog_covers_workforce_commands():
    from app.channels.commands import COMMAND_DESCRIPTIONS, KNOWN_CHANNEL_COMMANDS, describe_channel_commands, is_known_channel_command

    for cmd in ("/plan", "/swarm", "/team", "/project", "/approve", "/reject", "/standup"):
        assert cmd in KNOWN_CHANNEL_COMMANDS
        assert is_known_channel_command(f"{cmd} extra args")
    catalog = describe_channel_commands()
    assert {c["command"] for c in catalog} == set(KNOWN_CHANNEL_COMMANDS)
    assert all(c["description"] for c in catalog)
    assert COMMAND_DESCRIPTIONS["/help"]


@pytest.mark.asyncio
async def test_gateway_mounts_workforce_routes() -> None:
    from app.gateway.app import create_app

    paths = {route.path for route in create_app().routes}
    assert "/api/missions" in paths
    assert "/api/policy/evaluate" in paths
    assert "/api/policy/approvals" in paths
    assert "/api/council/cases" in paths
    assert "/api/benchmarks/suites" in paths
    assert "/api/evolution/candidates" in paths
    assert "/api/ops/advice" in paths
    assert "/api/bots/select" in paths
    assert "/api/bots/route-task" in paths
    assert "/api/plan-mode/interview/questions" in paths
    assert "/api/plan-mode/interview/review" in paths
    assert "/api/skills/tiers" in paths
    assert "/api/scheduled-tasks/{task_id}/deliveries" in paths
    assert "/api/groups/by-project/{project_id}" in paths
    assert "/api/projects/{project_id}/join" in paths
    assert "/api/projects/{project_id}/presence" in paths
    assert "/api/projects/{project_id}/constitution" in paths
    assert "/api/projects/{project_id}/state" in paths
    assert "/api/projects/{project_id}/decisions" in paths
    assert "/api/projects/{project_id}/locks" in paths
    assert "/api/projects/{project_id}/handoffs" in paths
    assert "/api/projects/{project_id}/events" in paths
    assert "/api/projects/{project_id}/context" in paths
    assert "/api/projects/{project_id}/completion-check" in paths
