"""
Doppler Weather Radar (DWR) API Router
Exposes status, file list, scan metadata, DBZ/VEL imagery, raster grids, and satellite/radar alignment diagnostics.
"""
import os
import logging
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from app.services.isro_radar.radar_loader import radar_loader
from app.services.isro_radar.radar_preprocessor import radar_preprocessor
from app.services.isro_radar.radar_visualization import radar_visualization
from app.services.isro_radar.radar_dataset import radar_dataset
from app.services.isro_radar.data_alignment import data_alignment

logger = logging.getLogger("VAJRA-AI.RadarRouter")

router = APIRouter(prefix="/api/data/radar", tags=["Doppler Weather Radar"])

@router.get("/status")
def get_radar_status():
    """
    Returns real-time status of Cherrapunji Doppler Weather Radar (RSCHR) NetCDF ingestion.
    """
    inventory = radar_dataset.get_radar_inventory()
    if not inventory:
        return {
            "source": "ISRO/IMD Doppler Weather Radar (DWR)",
            "station_name": "Cherrapunji DWR (RSCHR)",
            "station_location": [25.2680, 91.7332],
            "status": "UNAVAILABLE",
            "reason": "NO_RADAR_NC_FILES_FOUND",
            "provenance": "NONE",
            "scans_count": 0
        }

    latest = inventory[-1]
    return {
        "source": "ISRO/IMD Doppler Weather Radar (DWR)",
        "station_name": "Cherrapunji DWR (RSCHR)",
        "station_location": [25.2680, 91.7332],
        "status": "AVAILABLE",
        "provenance": "ARCHIVE" if "2026" in latest["timestamp_iso"] else "REAL",
        "scans_count": len(inventory),
        "latest_scan_filename": latest["filename"],
        "latest_scan_time": latest["timestamp_iso"],
        "variables_available": ["DBZ", "VEL", "WIDTH", "ZDR", "PHIDP", "RHOHV"],
        "max_range": "240 km / 490 km"
    }

@router.get("/files")
def get_radar_files():
    """
    Returns chronological list of all discovered NetCDF radar files and metadata.
    """
    inventory = radar_dataset.get_radar_inventory()
    return {
        "status": "success",
        "scans_count": len(inventory),
        "inventory": inventory
    }

@router.get("/scan")
def get_radar_scan(
    filename: Optional[str] = Query(None, description="Specific radar NetCDF filename"),
    grid_rows: int = Query(64, description="Target raster grid rows"),
    grid_cols: int = Query(64, description="Target raster grid cols")
):
    """
    Reads, calibrates, and georeferences a specific radar scan into raster DBZ and VEL grids.
    """
    inventory = radar_dataset.get_radar_inventory()
    if not inventory:
        raise HTTPException(status_code=404, detail="No radar files available")

    target_file = None
    if filename:
        for item in inventory:
            if item["filename"] == filename:
                target_file = item["filepath"]
                break
        if not target_file:
            raise HTTPException(status_code=404, detail=f"Radar file {filename} not found")
    else:
        target_file = inventory[-1]["filepath"]

    radar_raw = radar_loader.read_radar_file(target_file)
    grid_res = radar_preprocessor.resample_to_grid(radar_raw, grid_shape=(grid_rows, grid_cols))

    return {
        "status": "AVAILABLE",
        "filename": radar_raw["filename"],
        "timestamp_iso": radar_raw["timestamp_iso"],
        "station_name": radar_raw["station_name"],
        "station_lat": radar_raw["station_lat"],
        "station_lon": radar_raw["station_lon"],
        "max_range_km": radar_raw["max_range_km"],
        "bounds": grid_res["bounds"],
        "max_dbz": grid_res["max_dbz"],
        "max_vel": grid_res["max_vel"],
        "grid_dbz": grid_res["grid_dbz"].tolist(),
        "grid_vel": grid_res["grid_vel"].tolist()
    }

@router.get("/plot")
def get_radar_plot(filename: Optional[str] = Query(None, description="Specific radar NetCDF filename")):
    """
    Renders and serves 2-panel DBZ / VEL PNG map for a radar scan.
    """
    inventory = radar_dataset.get_radar_inventory()
    if not inventory:
        return JSONResponse(status_code=404, content={"detail": "No radar files available"})

    target_file = None
    if filename:
        for item in inventory:
            if item["filename"] == filename:
                target_file = item["filepath"]
                break
        if not target_file:
            return JSONResponse(status_code=404, content={"detail": f"Radar file {filename} not found"})
    else:
        target_file = inventory[-1]["filepath"]

    radar_raw = radar_loader.read_radar_file(target_file)
    grid_res = radar_preprocessor.resample_to_grid(radar_raw, grid_shape=(64, 64))

    plot_path = radar_visualization.generate_radar_plot(radar_raw, grid_res)
    if plot_path and os.path.exists(plot_path):
        return FileResponse(plot_path, media_type="image/png", filename=os.path.basename(plot_path))
    return JSONResponse(status_code=500, content={"detail": "Radar plot generation failed"})

@router.get("/alignment")
def get_satellite_radar_alignment(roi_name: str = Query("NATIONAL", description="Selected Satellite ROI")):
    """
    Exposes spatial overlap and temporal matching diagnostics between INSAT-3DS satellite and Cherrapunji DWR radar.
    """
    return data_alignment.match_satellite_and_radar_sequences(roi_name=roi_name)

@router.get("/live-stream")
def get_live_radar_stream():
    """
    Returns real-time open Doppler radar stream metadata and MapLibre tile schema.
    Zero authentication keys required.
    """
    from app.services.live_open_streams import live_open_streams
    return live_open_streams.get_live_radar_metadata()

