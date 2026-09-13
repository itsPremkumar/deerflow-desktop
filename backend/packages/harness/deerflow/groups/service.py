"""Group Chat Service with Zero-Config Room and Member Auto-Provisioning."""

from __future__ import annotations

import json
import logging
import threading
from pathlib import Path
from typing import Any, Sequence
from uuid import uuid4

from deerflow.bots.registry import get_bot_registry
from deerflow.groups.orchestration import GroupOrchestrator
from deerflow.groups.quorum import QuorumEngine
from deerflow.groups.room import GroupMessage, GroupRoom, OrchestrationMode, _now

logger = logging.getLogger(__name__)

_DEFAULT_GROUPS_DIR = ".deerflow/groups"


class GroupChatService:
    """Manages group chat rooms, member enrollment, and multi-agent coordination."""

    def __init__(self, storage_path: str | Path | None = None):
        self.storage_path = Path(storage_path).resolve() if storage_path else Path.cwd() / _DEFAULT_GROUPS_DIR / "rooms.json"
        self._rooms: dict[str, GroupRoom] = {}
        self.orchestrator = GroupOrchestrator()
        self.quorum = QuorumEngine()
        self._lock = threading.Lock()
        self._load()

    def _load(self) -> None:
        if not self.storage_path.exists():
            return
        try:
            with open(self.storage_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            for item in data.get("rooms", []):
                room = GroupRoom.from_dict(item)
                self._rooms[room.name.lower()] = room
        except Exception:
            pass

    def _save(self) -> None:
        try:
            self.storage_path.parent.mkdir(parents=True, exist_ok=True)
            data = {
                "version": 1,
                "rooms": [r.to_dict() for r in self._rooms.values()],
                "updated_at": _now(),
            }
            tmp = self.storage_path.with_suffix(".tmp")
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            tmp.replace(self.storage_path)
        except Exception:
            pass

    def get_or_create_room(
        self,
        name: str,
        topic: str = "General Team Collaboration",
        members: Sequence[str] | None = None,
        mode: OrchestrationMode = "mention",
        moderator: str | None = None,
    ) -> GroupRoom:
        """Fetch existing room or auto-provision a new room and all missing bot members."""
        key = name.lower().strip()
        bot_registry = get_bot_registry()

        with self._lock:
            if key in self._rooms:
                room = self._rooms[key]
                # If new members are supplied, add them
                if members:
                    for m in members:
                        m_clean = m.lower().strip()
                        bot_registry.get_or_create(m_clean)
                        if m_clean not in room.members:
                            room.members.append(m_clean)
                    self._save()
                return room

            # Auto-provision members in the bot registry
            default_members = list(members) if members else ["architect", "coder", "reviewer"]
            clean_members: list[str] = []
            for m in default_members:
                m_clean = m.lower().strip()
                bot_registry.get_or_create(m_clean)
                clean_members.append(m_clean)

            assigned_moderator = moderator.lower().strip() if moderator else clean_members[0]

            room = GroupRoom(
                room_id=f"room_{uuid4().hex[:8]}",
                name=key,
                topic=topic,
                members=clean_members,
                mode=mode,
                moderator=assigned_moderator,
            )
            self._rooms[key] = room
            self._save()
            return room

    def get_room(self, name: str) -> GroupRoom | None:
        with self._lock:
            return self._rooms.get(name.lower().strip())

    def list_rooms(self) -> list[GroupRoom]:
        with self._lock:
            return list(self._rooms.values())

    def post_message(
        self,
        room_name: str,
        sender: str,
        content: str,
        *,
        intent: str = "discussion",
        metadata: dict[str, Any] | None = None,
    ) -> tuple[GroupMessage, list[str]]:
        """Post a message into a room and compute next scheduled speakers."""
        room = self.get_or_create_room(room_name)
        mentions = self.orchestrator.parse_mentions(content, room.members)

        msg = room.append_message(
            sender=sender,
            content=content,
            intent=intent,  # type: ignore[arg-type]
            mentions=mentions,
            metadata=metadata or {},
        )
        self._save()

        next_speakers = self.orchestrator.resolve_next_speakers(room, msg)
        return msg, next_speakers


_global_groups = GroupChatService()


def get_group_chat_service() -> GroupChatService:
    return _global_groups
