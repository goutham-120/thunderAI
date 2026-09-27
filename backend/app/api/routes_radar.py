"""
ISRO Doppler Weather Radar (DWR) API Router (Step 3)
Exposes status and radar volume scan observation endpoints for ISRO / IMD DWR network.

SECURITY MANDATE:
NEVER expose ISRO_DWR_USERNAME or ISRO_DWR_PASSWORD in API responses or log output.
"""
import logging
from fastapi import APIRouter, Query
from app.config import config
from app.services.isro_radar.client import isro_radar_client

logger = logging.getLogger("VAJRA-AI.RadarRouter")

router = APIRouter(prefix="/api/data/radar", tags=["ISRO Doppler Weather Radar Connector"])

@router.get("/status")
def get_radar_status():
    """
    Returns the real-time operational status and metadata for ISRO / IMD Doppler Weather Radar ingestion.
    """
    return isro_radar_client.get_status()

@router.get("/observations")
def get_radar_observations(
    lat: float = Query(default=config.OPEN_METEO_LAT, description="Latitude in decimal degrees"),
    lon: float = Query(default=config.OPEN_METEO_LON, description="Longitude in decimal degrees")
):
    """
    Retrieves real ISRO DWR radar observations (reflectivity dBZ & radial velocity m/s).
    If ISRO DWR access is unconfigured, explicitly reports status=UNAVAILABLE with reason=ISRO_DWR_ACCESS_NOT_CONFIGURED.
    Does NOT generate fake radar observations.
    """
    return isro_radar_client.fetch_radar_observations(latitude=lat, longitude=lon)
