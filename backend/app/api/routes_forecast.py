"""
Forecast & Nowcast API Router
"""
from fastapi import APIRouter, Query
from app.services.forecast_engine import forecast_engine
from app.config import config

router = APIRouter(prefix="/api/forecast", tags=["Forecast"])

@router.get("/latest")
def get_latest_nowcast(
    horizon_min: int = Query(30, description="Forecast lead time in minutes (15, 30, 45, 60, 90, 120, 180)"),
    event_id: str = Query("LIVE", description="Event ID: LIVE, HYD-PREMONSOON-2024, ODISHA-KALBAISAKHI-2024, etc."),
    t_offset_minutes: int = Query(0, description="Timeline playback offset in minutes")
):
    return forecast_engine.get_complete_nowcast(
        horizon_min=horizon_min,
        event_id=event_id,
        t_offset_minutes=t_offset_minutes
    )

@router.get("/horizons")
def get_available_horizons():
    return {
        "available_horizons_minutes": config.HORIZONS_MINUTES,
        "default_horizon_minutes": 30
    }
