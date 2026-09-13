"""Dynamic Bot Registry with Zero-Config Auto-Provisioning.

Manages active bot profiles with automatic provisioning when an unknown bot
is messaged or @mentioned.
"""

from __future__ import annotations

import json
import logging
import os
import threading
from pathlib import Path
from typing import Any

from deerflow.bots.profile import BotProfile, _now, generate_default_soul

logger = logging.getLogger(__name__)

_DEFAULT_BOT_DIR = ".deerflow/bots"


def _infer_role_from_name(name: str) -> str:
    """Infer sensible role and specialties based on name slug."""
    n = name.lower()
    if "arch" in n:
        return "System Architect & Technical Lead"
    elif "review" in n:
        return "Code & Quality Reviewer"
    elif "test" in n or "qa" in n:
        return "QA & Automated Verification Specialist"
    elif "sec" in n:
        return "Security & Vulnerability Analyst"
    elif "data" in n or "sql" in n:
        return "Data Engineer & Database Specialist"
    elif "front" in n or "ui" in n:
        return "Frontend & Design Specialist"
    elif "devops" in n or "ops" in n:
        return "DevOps & Infrastructure Engineer"
    elif "research" in n:
        return "Deep Researcher & Synthesis Specialist"
    elif "code" in n or "dev" in n:
        return "Software Engineer & Backend Developer"
    return "Autonomous Specialist Teammate"


class BotRegistry:
    """Thread-safe registry for autonomous Bot profiles with auto-provisioning."""

    def __init__(self, storage_path: str | Path | None = None):
        self.storage_path = Path(storage_path).resolve() if storage_path else Path.cwd() / _DEFAULT_BOT_DIR / "roster.json"
        self._bots: dict[str, BotProfile] = {}
        self._lock = threading.Lock()
        self._load()

        # Ensure default foundational team exists
        self._ensure_default_roster()

    def _ensure_default_roster(self) -> None:
        defaults = [
            ("architect", "Architect", "System Architect & Technical Lead"),
            ("coder", "Coder", "Software Engineer & Backend Developer"),
            ("reviewer", "Reviewer", "Code & Quality Reviewer"),
            ("tester", "Tester", "QA & Automated Verification Specialist"),
            ("researcher", "Researcher", "Deep Researcher & Synthesis Specialist"),
        ]
        with self._lock:
            for name, display, role in defaults:
                if name not in self._bots:
                    soul = generate_default_soul(name, role)
                    bot = BotProfile(
                        name=name,
                        display_name=display,
                        role=role,
                        soul=soul,
                        toolsets=["all"],
                    )
                    self._bots[name] = bot
            self._save()

    def _load(self) -> None:
        if not self.storage_path.exists():
            return
        try:
            with open(self.storage_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            for item in data.get("bots", []):
                profile = BotProfile.from_dict(item)
                self._bots[profile.name.lower()] = profile
        except Exception:
            pass

    def _save(self) -> None:
        try:
            self.storage_path.parent.mkdir(parents=True, exist_ok=True)
            data = {
                "version": 1,
                "bots": [b.to_dict() for b in self._bots.values()],
                "updated_at": _now(),
            }
            tmp = self.storage_path.with_suffix(".tmp")
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            tmp.replace(self.storage_path)
        except Exception:
            pass

    def get_bot(self, name: str) -> BotProfile | None:
        with self._lock:
            return self._bots.get(name.lower().strip())

    def get_or_create(
        self,
        name: str,
        display_name: str | None = None,
        role: str | None = None,
        soul: str | None = None,
    ) -> BotProfile:
        """Fetch an existing bot or instantly auto-provision a new one."""
        key = name.lower().strip()
        with self._lock:
            if key in self._bots:
                return self._bots[key]

            # Auto-provision new bot on demand
            assigned_role = role or _infer_role_from_name(key)
            assigned_display = display_name or key.capitalize()
            assigned_soul = soul or generate_default_soul(key, assigned_role)

            bot = BotProfile(
                name=key,
                display_name=assigned_display,
                role=assigned_role,
                soul=assigned_soul,
                toolsets=["all"],
            )
            self._bots[key] = bot
            self._save()
            return bot

    def update_bot(
        self,
        name: str,
        *,
        display_name: str | None = None,
        role: str | None = None,
        soul: str | None = None,
        model: str | None = None,
        toolsets: list[str] | None = None,
        skills: list[str] | None = None,
    ) -> BotProfile | None:
        key = name.lower().strip()
        with self._lock:
            bot = self._bots.get(key)
            if not bot:
                return None
            if display_name is not None:
                bot.display_name = display_name
            if role is not None:
                bot.role = role
            if soul is not None:
                bot.soul = soul
            if model is not None:
                bot.model = model
            if toolsets is not None:
                bot.toolsets = toolsets
            if skills is not None:
                bot.skills = skills
            bot.updated_at = _now()
            self._save()
            return bot

    def list_bots(self) -> list[BotProfile]:
        with self._lock:
            return list(self._bots.values())


_global_registry = BotRegistry()


def get_bot_registry() -> BotRegistry:
    return _global_registry
