"""
IMD Data Validation and Data Cleaning Utilities
Performs strict schema validation, geographical bound checking, timestamp normalization to UTC ISO,
unit standardization, and anomaly/stale record filtering.
"""
import math
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

logger = logging.getLogger("VAJRA-AI.IMDValidation")

def validate_coordinates(lat: Any, lon: Any) -> bool:
    """Validates that latitude is within [-90, 90] and longitude is within [-180, 180]."""
    try:
        f_lat = float(lat)
        f_lon = float(lon)
        if math.isnan(f_lat) or math.isnan(f_lon):
            return False
        return (-90.0 <= f_lat <= 90.0) and (-180.0 <= f_lon <= 180.0)
    except (TypeError, ValueError):
        return False

def parse_iso_timestamp(ts_str: Any) -> Optional[str]:
    """
    Parses various timestamp representations into an ISO 8601 UTC string.
    Returns None if timestamp string is invalid or unparseable.
    """
    if not ts_str:
        return None

    if isinstance(ts_str, (int, float)):
        # Epoch timestamp in seconds or milliseconds
        try:
            val = float(ts_str)
            if val > 1e11: # milliseconds
                val = val / 1000.0
            dt = datetime.fromtimestamp(val, tz=timezone.utc)
            return dt.isoformat()
        except Exception:
            return None

    ts_str = str(ts_str).strip()
    formats_to_try = [
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%d-%m-%Y %H:%M:%S",
        "%Y/%m/%d %H:%M:%S",
        "%Y%m%d_%H%M%S"
    ]

    for fmt in formats_to_try:
        try:
            dt = datetime.strptime(ts_str, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.isoformat()
        except ValueError:
            continue

    logger.warning(f"[IMD] Unrecognized timestamp format: '{ts_str}'")
    return None

def safe_float(
    val: Any,
    min_val: Optional[float] = None,
    max_val: Optional[float] = None,
    decimals: Optional[int] = 2
) -> Optional[float]:
    """
    Safely converts a value to float.
    Returns None if val is null/invalid or outside specified range [min_val, max_val].
    Does NOT fabricate fake values.
    """
    if val is None:
        return None
    try:
        f_val = float(val)
        if math.isnan(f_val) or math.isinf(f_val):
            return None
        if min_val is not None and f_val < min_val:
            return None
        if max_val is not None and f_val > max_val:
            return None
        return round(f_val, decimals) if decimals is not None else f_val
    except (TypeError, ValueError):
        return None
