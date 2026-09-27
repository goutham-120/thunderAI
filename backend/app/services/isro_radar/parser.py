"""
ISRO Doppler Weather Radar (DWR) Parser & Spatial Regridder
Parses DWR Volume Scans (Reflectivity dBZ & Radial Velocity m/s) and resamples to VAJRA 64x64 grid.
Includes geographic coverage verification and timestamp provenance tagging (REAL < 24h vs ARCHIVE >= 24h).
"""
import numpy as np
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
from app.services.isro_radar.validation import validate_radar_coverage

def check_timestamp_provenance(timestamp_str: Optional[str]) -> str:
    """
    Returns 'REAL' if observation timestamp is within 24 hours of current UTC time.
    Returns 'ARCHIVE' if observation timestamp is older than 24 hours or unparseable.
    """
    if not timestamp_str:
        return "ARCHIVE"
    try:
        ts_clean = str(timestamp_str).replace("Z", "+00:00")
        obs_dt = datetime.fromisoformat(ts_clean)
        if obs_dt.tzinfo is None:
            obs_dt = obs_dt.replace(tzinfo=timezone.utc)
        now_dt = datetime.now(timezone.utc)
        age_seconds = (now_dt - obs_dt).total_seconds()
        if 0 <= age_seconds <= 86400: # 24 hours
            return "REAL"
        else:
            return "ARCHIVE"
    except Exception:
        return "ARCHIVE"

def resample_radar_to_grid(
    radar_grid: np.ndarray,
    orig_lats: np.ndarray,
    orig_lons: np.ndarray,
    target_bounds: Dict[str, float],
    target_rows: int = 64,
    target_cols: int = 64
) -> np.ndarray:
    """
    Spatial regridding of 2D radar raster array to target VAJRA grid.
    """
    if radar_grid is None or radar_grid.size == 0:
        return np.zeros((target_rows, target_cols), dtype=np.float32)

    target_lats = np.linspace(target_bounds["min_lat"], target_bounds["max_lat"], target_rows)
    target_lons = np.linspace(target_bounds["min_lon"], target_bounds["max_lon"], target_cols)

    lat_indices = np.clip(np.searchsorted(orig_lats, target_lats), 0, len(orig_lats) - 1)
    lon_indices = np.clip(np.searchsorted(orig_lons, target_lons), 0, len(orig_lons) - 1)

    regrid = radar_grid[np.ix_(lat_indices, lon_indices)].astype(np.float32)
    return regrid

def parse_radar_volume_scan(
    raw_payload: Dict[str, Any],
    target_bounds: Optional[Dict[str, float]] = None,
    target_rows: int = 64,
    target_cols: int = 64
) -> Dict[str, Any]:
    """
    Parses ISRO DWR volume scan structure containing reflectivity (dBZ) and radial velocity (m/s).
    
    Fields:
    - timestamp: ISO 8601 string
    - source: "ISRO DWR"
    - radar_site: Radar site identifier
    - site_lat / site_lon: radar site coordinates
    - dbz_grid / velocity_grid: 2D array [64, 64]
    - coverage_description: geographic coverage validation message
    - provenance: "REAL" (<24h) or "ARCHIVE" (>=24h)
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    ts_val = raw_payload.get("timestamp") or raw_payload.get("time") or now_iso
    provenance = check_timestamp_provenance(ts_val)

    bounds = target_bounds or {
        "min_lat": 15.5, "max_lat": 19.5,
        "min_lon": 76.5, "max_lon": 81.5
    }

    data = raw_payload.get("data") or raw_payload
    site_id = data.get("radar_site") or data.get("site_id") or "Visakhapatnam (VSKP DWR)"
    site_lat = float(data.get("site_lat", data.get("latitude", 17.72)))
    site_lon = float(data.get("site_lon", data.get("longitude", 83.25)))

    # Validate geographic radar coverage against target region bounds
    is_covered, dist_km, coverage_desc = validate_radar_coverage(
        site_lat=site_lat,
        site_lon=site_lon,
        max_range_km=250.0,
        target_bounds=bounds
    )

    # 1. Extract Reflectivity (dBZ)
    raw_dbz = data.get("reflectivity_dbz") or data.get("grid_dbz") or data.get("dbz")
    if isinstance(raw_dbz, list) and len(raw_dbz) > 0:
        arr_dbz = np.array(raw_dbz, dtype=np.float32)
        if arr_dbz.ndim == 2:
            orig_lats = np.linspace(bounds["min_lat"], bounds["max_lat"], arr_dbz.shape[0])
            orig_lons = np.linspace(bounds["min_lon"], bounds["max_lon"], arr_dbz.shape[1])
            dbz_grid = resample_radar_to_grid(arr_dbz, orig_lats, orig_lons, bounds, target_rows, target_cols)
        else:
            dbz_grid = np.full((target_rows, target_cols), float(arr_dbz.flat[0]), dtype=np.float32)
    elif isinstance(raw_dbz, (int, float)):
        dbz_grid = np.full((target_rows, target_cols), float(raw_dbz), dtype=np.float32)
    else:
        dbz_grid = np.zeros((target_rows, target_cols), dtype=np.float32)

    dbz_grid = np.clip(dbz_grid, 0.0, 75.0)

    # 2. Extract Radial Velocity (m/s)
    raw_vel = data.get("radial_velocity_ms") or data.get("grid_velocity") or data.get("velocity")
    if isinstance(raw_vel, list) and len(raw_vel) > 0:
        arr_vel = np.array(raw_vel, dtype=np.float32)
        if arr_vel.ndim == 2:
            orig_lats = np.linspace(bounds["min_lat"], bounds["max_lat"], arr_vel.shape[0])
            orig_lons = np.linspace(bounds["min_lon"], bounds["max_lon"], arr_vel.shape[1])
            vel_grid = resample_radar_to_grid(arr_vel, orig_lats, orig_lons, bounds, target_rows, target_cols)
        else:
            vel_grid = np.full((target_rows, target_cols), float(arr_vel.flat[0]), dtype=np.float32)
    elif isinstance(raw_vel, (int, float)):
        vel_grid = np.full((target_rows, target_cols), float(raw_vel), dtype=np.float32)
    else:
        vel_grid = np.zeros((target_rows, target_cols), dtype=np.float32)

    vel_grid = np.clip(vel_grid, -50.0, 50.0)

    return {
        "timestamp": ts_val,
        "source": "ISRO DWR",
        "radar_site": site_id,
        "site_lat": site_lat,
        "site_lon": site_lon,
        "coverage_is_valid": is_covered,
        "distance_to_center_km": dist_km,
        "coverage": f"{site_id} / Andhra Pradesh Cluster - {coverage_desc}",
        "provenance": provenance,
        "max_dbz": float(np.max(dbz_grid)),
        "mean_dbz": float(np.mean(dbz_grid)),
        "dbz_grid": dbz_grid,
        "velocity_grid": vel_grid
    }
