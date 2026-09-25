"""
Alerts, XAI, Replay, and Benchmark Metrics API Routers
"""
from fastapi import APIRouter, Query
from app.services.forecast_engine import forecast_engine
from app.services.historical_events import historical_service
from app.services.metrics_engine import metrics_engine
from app.services.xai_engine import xai_engine

# --- Alerts Router ---
alerts_router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

@alerts_router.get("/active")
def get_active_alerts(event_id: str = Query("LIVE"), t_offset_minutes: int = Query(0)):
    nowcast = forecast_engine.get_complete_nowcast(horizon_min=30, event_id=event_id, t_offset_minutes=t_offset_minutes)
    return {
        "status": "success",
        "count": len(nowcast["cap_alerts"]),
        "alerts": nowcast["cap_alerts"]
    }

# --- XAI Router ---
xai_router = APIRouter(prefix="/api/explainability", tags=["XAI"])

@xai_router.get("/drivers")
def get_explainability(
    p_thunder: float = Query(0.85),
    p_lightning: float = Query(0.90),
    max_dbz: float = Query(55.0),
    cloud_top_c: float = Query(-65.0),
    cape_jkg: float = Query(2400.0),
    cin_jkg: float = Query(25.0),
    wind_shear_kts: float = Query(22.0),
    lightning_rate: float = Query(28.0)
):
    return xai_engine.explain_cell_or_point(
        p_thunder=p_thunder,
        p_lightning=p_lightning,
        max_dbz=max_dbz,
        cloud_top_c=cloud_top_c,
        cape_jkg=cape_jkg,
        cin_jkg=cin_jkg,
        wind_shear_kts=wind_shear_kts,
        lightning_rate=lightning_rate
    )

# --- Replay Router ---
replay_router = APIRouter(prefix="/api/replay", tags=["Historical Replay"])

@replay_router.get("/events")
def list_replay_events():
    return {
        "status": "success",
        "events": historical_service.get_available_events()
    }

@replay_router.get("/events/{event_id}")
def get_event_details(event_id: str):
    return historical_service.get_event_by_id(event_id)

# --- Metrics Router ---
metrics_router = APIRouter(prefix="/api/metrics", tags=["Validation & Metrics"])

@metrics_router.get("/benchmark")
def get_benchmark():
    return metrics_engine.get_benchmark_comparison()
