"""Legacy backward-compatibility shim for variation_operator_tool.py."""

from __future__ import annotations

from .variation_operator_tool import run_nvidia_avo_step, run_variation_operator_step

__all__ = ["run_variation_operator_step", "run_nvidia_avo_step"]
