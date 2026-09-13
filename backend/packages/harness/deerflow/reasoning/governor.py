"""Reasoning Governor dynamically modulating thinking tokens and model effort."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

ReasoningTier = Literal["fast", "balanced", "deep"]


@dataclass
class ReasoningConfig:
    tier: ReasoningTier
    thinking_budget_tokens: int
    temperature: float
    timeout_seconds: float
    reason: str


class ReasoningGovernor:
    """Modulates thinking token allocation based on task complexity heuristics."""

    TIER_PRESETS: dict[ReasoningTier, dict[str, float | int]] = {
        "fast": {
            "thinking_budget_tokens": 0,
            "temperature": 0.1,
            "timeout_seconds": 15.0,
        },
        "balanced": {
            "thinking_budget_tokens": 4000,
            "temperature": 0.5,
            "timeout_seconds": 60.0,
        },
        "deep": {
            "thinking_budget_tokens": 16000,
            "temperature": 0.7,
            "timeout_seconds": 180.0,
        },
    }

    # Commands or quick questions that need zero reasoning overhead
    FAST_PREFIXES = [
        re.compile(r"^\s*(ls|dir|pwd|status|git status|check|echo|cat|grep|view|read|find)\b", re.IGNORECASE),
        re.compile(r"\b(fix typo|format json|lint check)\b", re.IGNORECASE),
    ]

    DEEP_PATTERNS = [
        re.compile(r"\b(architect|redesign|refactor|optimize|security audit|concurrency|race condition)\b", re.IGNORECASE),
        re.compile(r"\b(complex|multi-threaded|distributed|consensus|in-depth|reasoning)\b", re.IGNORECASE),
    ]

    def __init__(self, default_tier: ReasoningTier = "balanced"):
        self.default_tier = default_tier
        self.manual_override: ReasoningTier | None = None

    def set_override(self, tier: ReasoningTier | None) -> None:
        self.manual_override = tier

    def evaluate(self, prompt: str) -> ReasoningConfig:
        """Evaluate prompt and determine optimal reasoning tier and token budget."""
        if self.manual_override:
            tier = self.manual_override
            preset = self.TIER_PRESETS[tier]
            return ReasoningConfig(
                tier=tier,
                thinking_budget_tokens=int(preset["thinking_budget_tokens"]),
                temperature=float(preset["temperature"]),
                timeout_seconds=float(preset["timeout_seconds"]),
                reason=f"Manual override active: {tier}",
            )

        text = prompt.strip()

        # 1. Check Deep patterns
        for p in self.DEEP_PATTERNS:
            if p.search(text):
                preset = self.TIER_PRESETS["deep"]
                return ReasoningConfig(
                    tier="deep",
                    thinking_budget_tokens=int(preset["thinking_budget_tokens"]),
                    temperature=float(preset["temperature"]),
                    timeout_seconds=float(preset["timeout_seconds"]),
                    reason="Complex architecture / deep reasoning pattern matched.",
                )

        # 2. Check Fast prefix / commands (only if short query without implementation goals)
        if len(text) < 100 and not re.search(r"\b(add|create|implement|build|write|develop)\b", text, re.IGNORECASE):
            for p in self.FAST_PREFIXES:
                if p.search(text):
                    preset = self.TIER_PRESETS["fast"]
                    return ReasoningConfig(
                        tier="fast",
                        thinking_budget_tokens=int(preset["thinking_budget_tokens"]),
                        temperature=float(preset["temperature"]),
                        timeout_seconds=float(preset["timeout_seconds"]),
                        reason="Lightweight fast-mode pattern matched (0 thinking overhead).",
                    )

        # 3. Default balanced
        preset = self.TIER_PRESETS[self.default_tier]
        return ReasoningConfig(
            tier=self.default_tier,
            thinking_budget_tokens=int(preset["thinking_budget_tokens"]),
            temperature=float(preset["temperature"]),
            timeout_seconds=float(preset["timeout_seconds"]),
            reason="Standard balanced reasoning profile.",
        )


_global_governor = ReasoningGovernor()


def get_reasoning_governor() -> ReasoningGovernor:
    return _global_governor
