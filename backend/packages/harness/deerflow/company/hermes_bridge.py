"""Legacy backward-compatibility shim for swarm_bridge.py."""

from __future__ import annotations

from .swarm_bridge import (
    DEFAULT_HERMES_DIR,
    DEFAULT_SWARM_DIR,
    HermesBotMetadata,
    HermesLocalBridge,
    SwarmBotMetadata,
    SwarmLocalBridge,
)

__all__ = [
    "DEFAULT_HERMES_DIR",
    "DEFAULT_SWARM_DIR",
    "HermesBotMetadata",
    "HermesLocalBridge",
    "SwarmBotMetadata",
    "SwarmLocalBridge",
]
