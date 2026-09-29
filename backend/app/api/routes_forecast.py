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
    t_offset_minutes: int = Query(0, description="Timeline playback offset in minutes"),
    region_name: str = Query(None, description="Selected Region or State name"),
    lat: float = Query(None, description="Target Latitude"),
    lon: float = Query(None, description="Target Longitude"),
    min_lat: float = Query(None, description="Bounding Area Min Latitude"),
    max_lat: float = Query(None, description="Bounding Area Max Latitude"),
    min_lon: float = Query(None, description="Bounding Area Min Longitude"),
    max_lon: float = Query(None, description="Bounding Area Max Longitude")
):
    return forecast_engine.get_complete_nowcast(
        horizon_min=horizon_min,
        event_id=event_id,
        t_offset_minutes=t_offset_minutes,
        region_name=region_name,
        lat=lat, lon=lon,
        min_lat=min_lat, max_lat=max_lat,
        min_lon=min_lon, max_lon=max_lon
    )

@router.get("/horizons")
def get_available_horizons():
    return {
        "available_horizons_minutes": config.HORIZONS_MINUTES,
        "default_horizon_minutes": 30
    }

@router.get("/area")
def analyze_area_nowcast(
    lat: float = Query(None, description="Target Latitude for Point Selection"),
    lon: float = Query(None, description="Target Longitude for Point Selection"),
    min_lat: float = Query(None, description="Bounding Area Min Latitude"),
    max_lat: float = Query(None, description="Bounding Area Max Latitude"),
    min_lon: float = Query(None, description="Bounding Area Min Longitude"),
    max_lon: float = Query(None, description="Bounding Area Max Longitude"),
    horizon_min: int = Query(30, description="Lead time horizon in minutes"),
    event_id: str = Query("LIVE", description="Event ID")
):
    return forecast_engine.analyze_area_nowcast(
        lat=lat, lon=lon,
        min_lat=min_lat, max_lat=max_lat,
        min_lon=min_lon, max_lon=max_lon,
        horizon_min=horizon_min, event_id=event_id
    )

