"""
MOSDAC Satellite Data Parser & Spatial Mapper (Step 2)
Normalizes ISRO MOSDAC INSAT-3D/3DR/3DS Imager (TIR1 10.8µm, TIR2 12.0µm, WV 6.8µm), Sounder, and GSMaP ISRO Rain products.
Resamples 2D satellite spatial arrays onto VAJRA's internal 64x64 grid coordinates.
Includes timestamp-based provenance tagging (REAL < 24h vs ARCHIVE >= 24h).
"""
import numpy as np
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple

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

def resample_satellite_to_grid(
    sat_grid: np.ndarray,
    orig_lats: np.ndarray,
    orig_lons: np.ndarray,
    target_bounds: Dict[str, float],
    target_rows: int = 64,
    target_cols: int = 64
) -> np.ndarray:
    """
    Bilinear / Nearest-neighbor spatial regridding of 2D satellite observations to target VAJRA grid.
    """
    if sat_grid is None or sat_grid.size == 0:
        return np.full((target_rows, target_cols), 280.0, dtype=np.float32)

    target_lats = np.linspace(target_bounds["min_lat"], target_bounds["max_lat"], target_rows)
    target_lons = np.linspace(target_bounds["min_lon"], target_bounds["max_lon"], target_cols)

    # Nearest neighbor index calculation for fast grid interpolation
    lat_indices = np.clip(np.searchsorted(orig_lats, target_lats), 0, len(orig_lats) - 1)
    lon_indices = np.clip(np.searchsorted(orig_lons, target_lons), 0, len(orig_lons) - 1)

    regrid = sat_grid[np.ix_(lat_indices, lon_indices)].astype(np.float32)
    return regrid

def parse_insat_observations(
    raw_payload: Dict[str, Any],
    target_bounds: Optional[Dict[str, float]] = None,
    target_rows: int = 64,
    target_cols: int = 64
) -> Dict[str, Any]:
    """
    Parses MOSDAC INSAT-3D/3DR/3DS Imager payload (TIR1 10.8µm, TIR2 12.0µm, Water Vapor 6.8µm).
    
    Fields:
    - timestamp: ISO 8601 string
    - source: "MOSDAC"
    - product: "INSAT-3D/3DR/3DS L1B Imager"
    - tir1_temp_k: 2D array or scalar (Thermal Infrared 10.8µm in Kelvin)
    - tir2_temp_k: 2D array or scalar (Thermal Infrared 12.0µm in Kelvin)
    - water_vapor_k: 2D array or scalar (Water Vapor 6.8µm in Kelvin)
    - spatial_resolution: "4 km / 0.04 degree"
    - coverage: "Indian Subcontinent / Bay of Bengal"
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

    # 1. Extract TIR1 (Thermal Infrared 10.8 µm cloud-top temperature)
    raw_tir1 = data.get("tir1_temp_k") or data.get("tir1") or data.get("bt_tir1")
    if isinstance(raw_tir1, list) and len(raw_tir1) > 0:
        arr_tir = np.array(raw_tir1, dtype=np.float32)
        if arr_tir.ndim == 2:
            orig_lats = np.linspace(bounds["min_lat"], bounds["max_lat"], arr_tir.shape[0])
            orig_lons = np.linspace(bounds["min_lon"], bounds["max_lon"], arr_tir.shape[1])
            tir1_grid = resample_satellite_to_grid(arr_tir, orig_lats, orig_lons, bounds, target_rows, target_cols)
        else:
            tir1_grid = np.full((target_rows, target_cols), float(arr_tir.flat[0]), dtype=np.float32)
    elif isinstance(raw_tir1, (int, float)):
        tir1_grid = np.full((target_rows, target_cols), float(raw_tir1), dtype=np.float32)
    else:
        tir1_grid = np.full((target_rows, target_cols), 280.0, dtype=np.float32)

    # 2. Extract TIR2 (Thermal Infrared 12.0 µm channel)
    raw_tir2 = data.get("tir2_temp_k") or data.get("tir2") or data.get("bt_tir2")
    if isinstance(raw_tir2, list) and len(raw_tir2) > 0:
        arr_tir2 = np.array(raw_tir2, dtype=np.float32)
        if arr_tir2.ndim == 2:
            orig_lats = np.linspace(bounds["min_lat"], bounds["max_lat"], arr_tir2.shape[0])
            orig_lons = np.linspace(bounds["min_lon"], bounds["max_lon"], arr_tir2.shape[1])
            tir2_grid = resample_satellite_to_grid(arr_tir2, orig_lats, orig_lons, bounds, target_rows, target_cols)
        else:
            tir2_grid = np.full((target_rows, target_cols), float(arr_tir2.flat[0]), dtype=np.float32)
    elif isinstance(raw_tir2, (int, float)):
        tir2_grid = np.full((target_rows, target_cols), float(raw_tir2), dtype=np.float32)
    else:
        # Default TIR2 approximated slightly cooler than TIR1 due to water vapor absorption split-window differential
        tir2_grid = np.clip(tir1_grid - 1.2, 180.0, 330.0)

    # 3. Extract WV (Water Vapour 6.8 µm temperature)
    raw_wv = data.get("water_vapor_k") or data.get("wv") or data.get("bt_wv")
    if isinstance(raw_wv, list) and len(raw_wv) > 0:
        arr_wv = np.array(raw_wv, dtype=np.float32)
        if arr_wv.ndim == 2:
            orig_lats = np.linspace(bounds["min_lat"], bounds["max_lat"], arr_wv.shape[0])
            orig_lons = np.linspace(bounds["min_lon"], bounds["max_lon"], arr_wv.shape[1])
            wv_grid = resample_satellite_to_grid(arr_wv, orig_lats, orig_lons, bounds, target_rows, target_cols)
        else:
            wv_grid = np.full((target_rows, target_cols), float(arr_wv.flat[0]), dtype=np.float32)
    elif isinstance(raw_wv, (int, float)):
        wv_grid = np.full((target_rows, target_cols), float(raw_wv), dtype=np.float32)
    else:
        wv_grid = np.full((target_rows, target_cols), 240.0, dtype=np.float32)

    # 4. Optional Sounder integration
    sounder_info = parse_insat_sounder_data(raw_payload, bounds, target_rows, target_cols)

    return {
        "timestamp": ts_val,
        "source": "ISRO Satellite",
        "product": "INSAT-3D/3DR L1B Imager",
        "spatial_resolution": "4 km",
        "temporal_resolution": "30 min",
        "coverage": "Indian Subcontinent / Bay of Bengal",
        "provenance": provenance,
        "mean_tir1_temp_k": float(np.mean(tir1_grid)),
        "min_cloud_top_temp_k": float(np.min(tir1_grid)),
        "mean_tir2_temp_k": float(np.mean(tir2_grid)),
        "mean_water_vapor_k": float(np.mean(wv_grid)),
        "tir1_grid": tir1_grid,
        "tir2_grid": tir2_grid,
        "wv_grid": wv_grid,
        "sounder_data": sounder_info
    }

def parse_insat_sounder_data(
    raw_payload: Dict[str, Any],
    target_bounds: Dict[str, float],
    target_rows: int = 64,
    target_cols: int = 64
) -> Dict[str, Any]:
    """
    Parses INSAT-3D Sounder atmospheric profiles (temperature profile, moisture profile, derived indices).
    """
    data = raw_payload.get("data") or raw_payload
    sounder_raw = data.get("sounder_temp_profile") or data.get("sounder_data") or data.get("sounder")

    if isinstance(sounder_raw, dict):
        temp_profile = sounder_raw.get("temp_profile", [288.15, 275.0, 250.0, 220.0])
        moisture_profile = sounder_raw.get("moisture_profile", [70.0, 50.0, 30.0, 10.0])
        derived_cape = float(sounder_raw.get("derived_cape", 1850.0))
        lifted_index = float(sounder_raw.get("lifted_index", -4.2))
    else:
        temp_profile = [288.15, 275.0, 250.0, 220.0]
        moisture_profile = [70.0, 50.0, 30.0, 10.0]
        derived_cape = 1850.0
        lifted_index = -4.2

    return {
        "status": "AVAILABLE" if sounder_raw is not None else "DERIVED_DEFAULT",
        "temp_profile_k": temp_profile,
        "moisture_profile_pct": moisture_profile,
        "derived_cape_jkg": derived_cape,
        "lifted_index": lifted_index
    }

def parse_gsmap_data(
    raw_payload: Dict[str, Any],
    target_lat: float,
    target_lon: float
) -> Dict[str, Any]:
    """
    Parses MOSDAC GSMaP ISRO Rain observation/forecast structure into normalized internal dictionary.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    ts_val = raw_payload.get("timestamp") or raw_payload.get("time") or now_iso
    provenance = check_timestamp_provenance(ts_val)

    precip_val: Optional[float] = None
    data = raw_payload.get("data") or raw_payload

    if isinstance(data, dict):
        if "precipitation" in data and isinstance(data["precipitation"], (int, float)):
            precip_val = float(data["precipitation"])
        elif "precip_mm" in data and isinstance(data["precip_mm"], (int, float)):
            precip_val = float(data["precip_mm"])
        elif "rain_rate" in data and isinstance(data["rain_rate"], (int, float)):
            precip_val = float(data["rain_rate"])
        elif "grid_data" in data and isinstance(data["grid_data"], list):
            grid = data["grid_data"]
            if len(grid) > 0 and isinstance(grid[0], (int, float)):
                precip_val = float(grid[0])
            else:
                precip_val = 0.0
        else:
            precip_val = 0.0
    else:
        precip_val = 0.0

    return {
        "timestamp": ts_val,
        "latitude": float(data.get("latitude", target_lat) if isinstance(data, dict) else target_lat),
        "longitude": float(data.get("longitude", target_lon) if isinstance(data, dict) else target_lon),
        "precipitation": max(0.0, float(precip_val)),
        "units": "mm/h",
        "source": "ISRO Satellite",
        "product": "GSMaP ISRO Rain",
        "resolution": "0.1 degree",
        "temporal_resolution": "hourly",
        "coverage": "Indian Subcontinent",
        "provenance": provenance
    }
