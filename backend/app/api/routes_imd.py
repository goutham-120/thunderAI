"""
IMD Data Connectors & Status API Router (Step 1A)
Exposes normalized IMD data streams (AWS/ARG, Radar, Lightning), source status, and data mode management.
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from app.config import config
from app.data_sources.imd.aws import aws_connector
from app.data_sources.imd.radar import radar_connector
from app.data_sources.imd.lightning import lightning_connector
from app.data_sources.imd.status import status_tracker
from app.services.data_harmonizer import harmonizer

router = APIRouter(prefix="/api/data/imd", tags=["IMD Real Data Connectors"])

@router.get("/status")
def get_imd_source_status():
    """Returns truthful real-time operational status for all IMD connectors."""
    return status_tracker.get_all_statuses(data_mode=config.DATA_MODE)

@router.get("/aws")
def get_imd_aws_data():
    """Fetches and returns normalized observation data from IMD AWS/ARG weather stations."""
    res = aws_connector.fetch_observations()
    return res

@router.get("/radar")
def get_imd_radar_data():
    """Fetches and returns normalized Doppler Weather Radar (DWR) data and site metadata."""
    res = radar_connector.fetch_radar_data()
    if res.get("grid") is not None:
        # Convert numpy array to list for JSON serialization
        res_copy = dict(res)
        res_copy["grid"] = res_copy["grid"].tolist()
        return res_copy
    return res

@router.get("/lightning")
def get_imd_lightning_data():
    """Fetches and returns normalized lightning strike detection events from IMD sensors."""
    res = lightning_connector.fetch_lightning_strikes()
    return res

@router.get("/mode")
def get_data_mode():
    """Returns current active data ingestion mode ('real' or 'synthetic')."""
    return {
        "active_data_mode": config.DATA_MODE,
        "supported_modes": ["real", "synthetic"]
    }

@router.post("/mode")
def set_data_mode(mode: str = Query("synthetic", description="Data mode: 'real' or 'synthetic'")):
    """Dynamically updates active data ingestion mode."""
    mode_clean = mode.strip().lower()
    if mode_clean not in ["real", "synthetic"]:
        raise HTTPException(status_code=400, detail="Invalid data mode. Must be 'real' or 'synthetic'.")

    config.DATA_MODE = mode_clean
    return {
        "status": "success",
        "previous_mode": config.DATA_MODE,
        "new_data_mode": mode_clean
    }
