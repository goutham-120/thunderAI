"""
MOSDAC Satellite Data API Router (Step 2 & 3)
Exposes status, INSAT-3D/3DR observations, and GSMaP satellite precipitation endpoints for ISRO MOSDAC.

SECURITY MANDATE:
NEVER expose MOSDAC_USERNAME, MOSDAC_PASSWORD, or credentials in API responses or log output.
"""
import logging
from fastapi import APIRouter, Query
from app.config import config
from app.services.mosdac.client import mosdac_client

logger = logging.getLogger("VAJRA-AI.MOSDACRouter")

router = APIRouter(prefix="/api/data/mosdac", tags=["MOSDAC Satellite Data Connector"])

@router.get("/status")
def get_mosdac_status():
    """
    Returns real-time operational status and metadata for MOSDAC INSAT-3D/3DR & GSMaP satellite products.
    """
    return mosdac_client.get_status()

@router.get("/insat")
def get_mosdac_insat(
    lat: float = Query(default=config.OPEN_METEO_LAT, description="Latitude in decimal degrees"),
    lon: float = Query(default=config.OPEN_METEO_LON, description="Longitude in decimal degrees")
):
    """
    Retrieves real INSAT-3D/3DR TIR1 (10.8µm) and Water Vapor (6.8µm) satellite observations.
    If MOSDAC access is unconfigured, explicitly reports status=UNAVAILABLE, reason=MOSDAC_ACCESS_NOT_CONFIGURED.
    Does NOT generate fake satellite observations.
    """
    return mosdac_client.fetch_insat_observations(latitude=lat, longitude=lon)

@router.get("/precipitation")
def get_mosdac_precipitation(
    lat: float = Query(default=config.OPEN_METEO_LAT, description="Latitude in decimal degrees"),
    lon: float = Query(default=config.OPEN_METEO_LON, description="Longitude in decimal degrees")
):
    """
    Retrieves real 0.1° hourly satellite precipitation from ISRO MOSDAC GSMaP ISRO Rain product.
    If MOSDAC access is unconfigured, explicitly reports status=UNAVAILABLE, reason=MOSDAC_ACCESS_NOT_CONFIGURED.
    Does NOT generate fake satellite observations.
    """
    return mosdac_client.fetch_gsmap_precipitation(latitude=lat, longitude=lon)
