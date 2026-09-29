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

@router.get("/insat3ds/sequence")
def get_insat3ds_sequence(roi_name: str = Query(default="AP_TELANGANA", description="Region of interest")):
    """
    Retrieves chronological INSAT-3DS inventory, latest scan convective features, and spatiotemporal tendencies.
    """
    from app.services.insat_3ds_processor import insat_processor
    inventory = insat_processor.scan_inventory()
    if not inventory:
        return {"status": "UNAVAILABLE", "reason": "NO_INSAT3DS_FILES_FOUND", "inventory": []}
    
    latest = inventory[-1]
    curr_scan = insat_processor.read_and_calibrate_scan(latest["filepath"], roi_name=roi_name)
    features = insat_processor.extract_convective_features(curr_scan)
    
    tendencies = None
    if len(inventory) >= 2:
        prev_scan = insat_processor.read_and_calibrate_scan(inventory[-2]["filepath"], roi_name=roi_name)
        tendencies = insat_processor.compute_spatiotemporal_tendencies(prev_scan, curr_scan)

    return {
        "status": "AVAILABLE",
        "scans_count": len(inventory),
        "latest_scan": latest["filename"],
        "latest_timestamp": latest["timestamp_iso"],
        "roi_name": roi_name,
        "convective_features": features,
        "spatiotemporal_tendencies": tendencies,
        "inventory": [
            {
                "filename": item["filename"],
                "timestamp_iso": item["timestamp_iso"],
                "size_mb": item["size_mb"],
                "gap_minutes_from_prev": item.get("gap_minutes_from_prev", 0),
                "missing_intermediate_scan": item.get("missing_intermediate_scan", False)
            }
            for item in inventory
        ]
    }

@router.get("/insat3ds/plot")
def get_insat3ds_plot(roi_name: str = Query(default="AP_TELANGANA", description="Region of interest")):
    """
    Generates and returns diagnostic 4-panel satellite plot for the latest INSAT-3DS scan.
    """
    import os
    from fastapi.responses import FileResponse, JSONResponse
    from app.services.insat_3ds_processor import insat_processor

    inventory = insat_processor.scan_inventory()
    if not inventory:
        return JSONResponse(status_code=404, content={"detail": "No INSAT-3DS files available"})
    
    latest = inventory[-1]
    curr_scan = insat_processor.read_and_calibrate_scan(latest["filepath"], roi_name=roi_name)
    plot_path = insat_processor.generate_diagnostic_plots(curr_scan)
    if plot_path and os.path.exists(plot_path):
        return FileResponse(plot_path, media_type="image/png", filename=os.path.basename(plot_path))
    return JSONResponse(status_code=500, content={"detail": "Plot generation failed"})

