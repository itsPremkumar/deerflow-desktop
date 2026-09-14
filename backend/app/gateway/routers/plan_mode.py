"""Cognitive Plan Mode API Router.

Provides Gateway endpoints for:
- 8-Dimensional Strategic Plan Evaluation (Paradigm, Swarm Mode, Reasoning, Workforce, Model, Isolation, Risk, Proof Obligations)
- Autonomous Dispatch across execution subsystems (Swarm, Bot Profile, MoA, Deep Research, Deep Think, Ephemeral Subagent, Direct Agent)
All computation runs via asyncio.to_thread to maintain Gateway non-blocking concurrency invariants.
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from app.gateway.deps import require_admin_user
from deerflow.planning.bridge import AutonomousDispatchBridge
from deerflow.planning.meta_planner import CognitiveMetaPlanner

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/plan-mode", tags=["plan-mode"])
_ADMIN_REQUIRED_DETAIL = "Admin privileges are required to trigger autonomous dispatch."


class PlanEvaluateRequest(BaseModel):
    prompt: str = Field(..., min_length=2, description="The user objective or prompt.")
    items: list[str] | None = Field(default=None, description="Optional batch items for parallel map-reduce.")
    max_concurrency: int = Field(default=8, ge=1, le=12, description="Concurrency limit for parallel tasks.")


class PlanDispatchRequest(BaseModel):
    prompt: str = Field(..., min_length=2, description="The user objective or prompt.")
    items: list[str] | None = Field(default=None, description="Optional batch items for parallel map-reduce.")
    max_concurrency: int = Field(default=8, ge=1, le=12, description="Concurrency limit for parallel tasks.")


@router.post("/evaluate")
async def evaluate_plan_mode(payload: PlanEvaluateRequest):
    """Evaluates the user prompt across all 8 strategic dimensions and returns the compiled MetaPlan."""
    plan = await asyncio.to_thread(
        CognitiveMetaPlanner.evaluate_and_plan,
        prompt=payload.prompt,
        items=payload.items,
        max_concurrency=payload.max_concurrency,
    )
    return plan.to_dict()


@router.post("/dispatch")
async def dispatch_plan_mode(payload: PlanDispatchRequest, request: Request):
    """Evaluates the prompt and immediately executes autonomous dispatch to the target subsystem."""
    await require_admin_user(request, detail=_ADMIN_REQUIRED_DETAIL)

    plan = await asyncio.to_thread(
        CognitiveMetaPlanner.evaluate_and_plan,
        prompt=payload.prompt,
        items=payload.items,
        max_concurrency=payload.max_concurrency,
    )

    dispatch_res = await AutonomousDispatchBridge.dispatch_async(plan)

    return {
        "plan": plan.to_dict(),
        "dispatch": dispatch_res.to_dict(),
    }
