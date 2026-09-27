"""
IITM / IMD Lightning Detection API Router (Step 4)
Exposes status and lightning strike observation endpoints for Damini / IITM LLN network.

SECURITY MANDATE:
NEVER expose LIGHTNING_USERNAME or LIGHTNING_PASSWORD in API responses or log output.
"""
import logging
from fastapi import APIRouter, Query
from app.config import config
from app.services.lightning.client import lightning_client

logger = logging.getLogger("VAJRA-AI.LightningRouter")

router = APIRouter(prefix="/api/data/lightning", tags=["IITM / IMD Lightning Network Connector"])

@router.get("/status")
def get_lightning_status():
    """
    Returns real-time operational status and metadata for IITM / IMD Damini Lightning detection ingestion.
    """
    return lightning_client.get_status()

@router.get("/strikes")
def get_lightning_strikes(
    lat: float = Query(default=config.OPEN_METEO_LAT, description="Latitude in decimal degrees"),
    lon: float = Query(default=config.OPEN_METEO_LON, description="Longitude in decimal degrees")
):
    """
    Retrieves real-time lightning strike observations from IITM / IMD Damini Lightning Network.
    If lightning access is unconfigured, explicitly reports status=UNAVAILABLE with reason=LIGHTNING_ACCESS_NOT_CONFIGURED.
    Does NOT generate fake lightning strike events.
    """
    return lightning_client.fetch_lightning_strikes(latitude=lat, longitude=lon)
