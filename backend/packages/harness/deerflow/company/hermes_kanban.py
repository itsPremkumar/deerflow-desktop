"""Legacy backward-compatibility shim for enterprise_kanban.py."""

from __future__ import annotations

from .enterprise_kanban import (
    DEFAULT_BOARD_DB,
    DEFAULT_HERMES_DIR,
    EnterpriseKanbanAdapter,
    HermesKanbanAdapter,
)

__all__ = [
    "DEFAULT_BOARD_DB",
    "DEFAULT_HERMES_DIR",
    "EnterpriseKanbanAdapter",
    "HermesKanbanAdapter",
]
