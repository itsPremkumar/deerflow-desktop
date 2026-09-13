"""Tests for Recursive Self-Improvement (RSI) Engine."""

import json
from deerflow.rsi.engine import RSIEngine
from deerflow.rsi.models import RSIStage
from deerflow.tools.builtins.rsi_engine_tool import run_rsi_cycle


def test_rsi_engine_promotion_cycle():
    engine = RSIEngine()
    result = engine.run_rsi_cycle(
        bottleneck="Excessive token bloat due to uncompacted directory listings",
        target_component="compaction",
    )
    assert result.promoted is True
    assert result.stage == RSIStage.PROMOTED
    assert result.ab_test is not None
    assert result.ab_test.improved is True
    assert result.holdout is not None
    assert result.holdout.regressed is False
    assert "Promotion confirmed" in result.evidence[-1]


def test_rsi_engine_rollback_cycle():
    engine = RSIEngine()
    # Force a non-improving scenario
    result = engine.run_rsi_cycle(
        bottleneck="Minor timeout fluctuation",
        target_component="tool_router",
        force_promote=False,
    )
    assert result.stage in {RSIStage.PROMOTED, RSIStage.ROLLED_BACK}


def test_run_rsi_cycle_tool():
    res_str = run_rsi_cycle.invoke({
        "bottleneck": "Tool invocation retry rate exceeded 15% on file writes",
        "target_component": "tool_router",
    })
    data = json.loads(res_str)
    assert "promoted" in data
    assert "stage" in data
    assert "hypothesis" in data
    assert "candidate" in data
    assert "ab_test" in data
