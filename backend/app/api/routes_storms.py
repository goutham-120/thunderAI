"""
Storm Intelligence API Router
"""
from fastapi import APIRouter, Query, HTTPException
from app.services.forecast_engine import forecast_engine

router = APIRouter(prefix="/api/storms", tags=["Storms"])

@router.get("/active")
def get_active_storms(
    event_id: str = Query("LIVE"),
    t_offset_minutes: int = Query(0)
):
    nowcast = forecast_engine.get_complete_nowcast(
        horizon_min=30,
        event_id=event_id,
        t_offset_minutes=t_offset_minutes
    )
    return {
        "status": "success",
        "count": len(nowcast["storm_cells"]),
        "storm_cells": nowcast["storm_cells"]
    }

@router.get("/{cell_id}")
def get_storm_by_id(cell_id: str, event_id: str = "LIVE"):
    nowcast = forecast_engine.get_complete_nowcast(horizon_min=30, event_id=event_id)
    for cell in nowcast["storm_cells"]:
        if cell["cell_id"].upper() == cell_id.upper():
            return cell
    raise HTTPException(status_code=404, detail="Storm cell not found")
