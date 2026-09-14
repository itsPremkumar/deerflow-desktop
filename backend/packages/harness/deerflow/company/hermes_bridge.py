"""Hermes Local Bridge: Discovers, parses, and connects local Hermes bot profiles to the Company OS."""

from __future__ import annotations

import logging
import os
from pathlib import Path

import yaml
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Default location for Hermes installation on Windows/Posix
DEFAULT_HERMES_DIR = Path(os.environ.get("HERMES_HOME", Path.home() / ".hermes"))


class HermesBotMetadata(BaseModel):
    name: str
    role: str = ""
    symbol: str = "🤖"
    style: str = ""
    responsibilities: list[str] = Field(default_factory=list)
    personality: list[str] = Field(default_factory=list)
    boundaries: list[str] = Field(default_factory=list)
    direct_reports: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    work_protocol: str = ""
    primary_model: str = "poolside/laguna-s-2.1:free"
    fallback_models: list[str] = Field(default_factory=list)
    has_local_profile: bool = True


class HermesLocalBridge:
    """Discovers and imports local Hermes bot profiles into DeerFlow Company OS."""

    def __init__(self, hermes_dir: Path | str | None = None):
        if hermes_dir:
            self._hermes_dir = Path(hermes_dir)
        else:
            self._hermes_dir = DEFAULT_HERMES_DIR
        self._bots_dir = self._hermes_dir / "bots"
        self._cached_profiles: dict[str, HermesBotMetadata] = {}

    @property
    def is_hermes_installed(self) -> bool:
        return self._bots_dir.exists() and self._bots_dir.is_dir()

    def discover_local_bots(self) -> list[str]:
        """Returns sorted list of all available Hermes bot profile directory names."""
        if not self.is_hermes_installed:
            return []
        try:
            return sorted([d.name for d in self._bots_dir.iterdir() if d.is_dir()])
        except Exception as exc:
            logger.warning(f"Error scanning Hermes bots dir: {exc}")
            return []

    def get_bot_metadata(self, bot_name: str) -> HermesBotMetadata:
        """Parses SOUL.md and config.yaml for a specific local Hermes bot profile."""
        if bot_name in self._cached_profiles:
            return self._cached_profiles[bot_name]

        bot_folder = self._bots_dir / bot_name
        if not bot_folder.exists() or not bot_folder.is_dir():
            # Return synthetic default if profile folder doesn't exist
            synthetic = HermesBotMetadata(
                name=bot_name,
                role=bot_name.replace("-", " ").title(),
                has_local_profile=False,
            )
            self._cached_profiles[bot_name] = synthetic
            return synthetic

        soul_file = bot_folder / "SOUL.md"
        config_file = bot_folder / "config.yaml"
        skills_file = bot_folder / "SKILLS.txt"

        role = bot_name.replace("-", " ").title()
        symbol = "🤖"
        style = ""
        responsibilities: list[str] = []
        personality: list[str] = []
        boundaries: list[str] = []
        direct_reports: list[str] = []
        work_protocol = ""

        # 1. Parse SOUL.md
        if soul_file.exists():
            try:
                content = soul_file.read_text(encoding="utf-8", errors="replace")
                lines = content.splitlines()
                current_section = ""
                for line in lines:
                    stripped = line.strip()
                    if stripped.startswith("## "):
                        current_section = stripped[3:].strip().lower()
                        continue

                    if "- **Role:**" in stripped:
                        role = stripped.split("- **Role:**")[-1].strip()
                    elif "- **Symbol:**" in stripped:
                        symbol = stripped.split("- **Symbol:**")[-1].strip()
                    elif "- **Style:**" in stripped:
                        style = stripped.split("- **Style:**")[-1].strip()
                    elif stripped.startswith("- ") and current_section:
                        item = stripped[2:].strip()
                        if "responsibilit" in current_section:
                            responsibilities.append(item)
                        elif "personality" in current_section:
                            personality.append(item)
                        elif "boundar" in current_section:
                            boundaries.append(item)
                        elif "direct report" in current_section:
                            direct_reports.append(item)

                if "## WORK ASSIGNMENT PROTOCOL" in content:
                    work_protocol = content.split("## WORK ASSIGNMENT PROTOCOL")[-1].split("##")[0].strip()
            except Exception as exc:
                logger.warning(f"Error parsing SOUL.md for {bot_name}: {exc}")

        # 2. Parse config.yaml
        primary_model = "poolside/laguna-s-2.1:free"
        fallback_models: list[str] = []
        if config_file.exists():
            try:
                conf_data = yaml.safe_load(config_file.read_text(encoding="utf-8", errors="replace")) or {}
                primary_model = conf_data.get("model", primary_model)
                fallback_models = conf_data.get("fallback_models", [])
            except Exception as exc:
                logger.warning(f"Error parsing config.yaml for {bot_name}: {exc}")

        # 3. Parse SKILLS.txt
        skills: list[str] = []
        if skills_file.exists():
            try:
                skills = [s.strip() for s in skills_file.read_text(encoding="utf-8", errors="replace").splitlines() if s.strip()]
            except Exception:
                pass

        meta = HermesBotMetadata(
            name=bot_name,
            role=role,
            symbol=symbol,
            style=style,
            responsibilities=responsibilities,
            personality=personality,
            boundaries=boundaries,
            direct_reports=direct_reports,
            skills=skills,
            work_protocol=work_protocol,
            primary_model=primary_model,
            fallback_models=fallback_models,
            has_local_profile=True,
        )
        self._cached_profiles[bot_name] = meta
        return meta

    def get_all_local_profiles(self) -> dict[str, HermesBotMetadata]:
        """Loads metadata for all discovered local Hermes bots."""
        bots = self.discover_local_bots()
        for b in bots:
            self.get_bot_metadata(b)
        return dict(self._cached_profiles)
