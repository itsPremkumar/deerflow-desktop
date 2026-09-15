"""Scheduled-occurrence delivery ledger API (exactly-once auditing)."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api", tags=["deliveries"])


class DeliveryMarkRequest(BaseModel):
    status: str = Field(..., min_length=1, max_length=16)
    artifact_ref: str | None = None
    channel: str | None = None
    error: str | None = Field(default=None, max_length=2000)


@router.get("/scheduled-tasks/{task_id}/deliveries")
async def list_deliveries(task_id: str) -> dict:
    def _do():
        from deerflow.scheduler.delivery import get_delivery_ledger

        rows = get_delivery_ledger().for_task(task_id)
        return {"task_id": task_id, "deliveries": [r.to_dict() for r in rows], "count": len(rows)}

    return await asyncio.to_thread(_do)


@router.post("/scheduled-tasks/{task_id}/deliveries/claim", status_code=201)
async def claim_delivery(task_id: str, occurrence_id: str) -> dict:
    def _do():
        from deerflow.scheduler.delivery import get_delivery_ledger

        rec, is_new = get_delivery_ledger().claim(task_id, occurrence_id)
        return {"delivery": rec.to_dict(), "is_new": is_new}

    return await asyncio.to_thread(_do)


@router.post("/scheduled-tasks/{task_id}/deliveries/{occurrence_id}/mark")
async def mark_delivery(task_id: str, occurrence_id: str, body: DeliveryMarkRequest) -> dict:
    if body.status not in ("delivered", "failed", "skipped", "pending"):
        raise HTTPException(status_code=422, detail="Invalid delivery status.")

    def _do():
        from deerflow.scheduler.delivery import get_delivery_ledger

        rec = get_delivery_ledger().mark(occurrence_id, body.status, artifact_ref=body.artifact_ref, channel=body.channel, error=body.error)
        return rec.to_dict() if rec else None

    result = await asyncio.to_thread(_do)
    if result is None:
        raise HTTPException(status_code=404, detail="Delivery record not found; claim it first.")
    return result
