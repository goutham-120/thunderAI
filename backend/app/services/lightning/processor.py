"""
Lightning Strike Processor & Spatial Density Binner
Performs geographic bounds filtering, duplicate strike removal, and point-to-grid density raster binning.
"""
import numpy as np
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

def deduplicate_strikes(strikes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Removes duplicate lightning strike events within identical timestamp and 0.001 degree spatial proximity.
    """
    seen = set()
    unique = []
    for st in strikes:
        lat = round(float(st.get("latitude", 0.0)), 3)
        lon = round(float(st.get("longitude", 0.0)), 3)
        ts = str(st.get("timestamp", ""))
        key = (lat, lon, ts)
        if key not in seen:
            seen.add(key)
            unique.append(st)
    return unique

def filter_geographic_bounds(
    strikes: List[Dict[str, Any]],
    target_bounds: Dict[str, float]
) -> List[Dict[str, Any]]:
    """
    Filters strike list to keep only events falling strictly inside target grid bounds.
    """
    min_lat = target_bounds["min_lat"]
    max_lat = target_bounds["max_lat"]
    min_lon = target_bounds["min_lon"]
    max_lon = target_bounds["max_lon"]

    filtered = []
    for st in strikes:
        lat = st.get("latitude")
        lon = st.get("longitude")
        if lat is not None and lon is not None:
            if min_lat <= float(lat) <= max_lat and min_lon <= float(lon) <= max_lon:
                filtered.append(st)
    return filtered

def bin_strikes_to_density_grid(
    strikes: List[Dict[str, Any]],
    target_bounds: Dict[str, float],
    rows: int = 64,
    cols: int = 64
) -> np.ndarray:
    """
    Bins point lightning strikes into a 2D spatial flash density grid [rows, cols] (flashes / km²).
    """
    density_grid = np.zeros((rows, cols), dtype=np.float32)
    if not strikes:
        return density_grid

    min_lat = target_bounds["min_lat"]
    max_lat = target_bounds["max_lat"]
    min_lon = target_bounds["min_lon"]
    max_lon = target_bounds["max_lon"]

    lat_step = (max_lat - min_lat) / rows
    lon_step = (max_lon - min_lon) / cols

    for st in strikes:
        lat = float(st["latitude"])
        lon = float(st["longitude"])

        r_idx = int((lat - min_lat) / lat_step)
        c_idx = int((lon - min_lon) / lon_step)
        r_idx = min(max(r_idx, 0), rows - 1)
        c_idx = min(max(c_idx, 0), cols - 1)
        density_grid[r_idx, c_idx] += 1.0

    return density_grid

def process_lightning_strikes(
    raw_strikes: List[Dict[str, Any]],
    target_bounds: Dict[str, float],
    rows: int = 64,
    cols: int = 64
) -> Dict[str, Any]:
    """
    Full processing pipeline: bounds filtering -> deduplication -> 2D spatial density grid binning.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    bounded = filter_geographic_bounds(raw_strikes, target_bounds)
    unique_strikes = deduplicate_strikes(bounded)
    density_grid = bin_strikes_to_density_grid(unique_strikes, target_bounds, rows=rows, cols=cols)

    return {
        "timestamp": now_iso,
        "raw_strikes_count": len(raw_strikes),
        "processed_strikes_count": len(unique_strikes),
        "max_cell_density": float(np.max(density_grid)),
        "mean_density": float(np.mean(density_grid)),
        "density_grid": density_grid,
        "strikes": unique_strikes
    }
