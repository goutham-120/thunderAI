"""
ISRO Doppler Weather Radar (DWR) Validation & Geographic Coverage Module
Validates HTTP response structure, data payload integrity, and geographic coverage for ISRO DWR volume scans.
"""
import math
from typing import Tuple, Dict, Any, Optional

def calculate_haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two lat/lon coordinates in kilometers.
    """
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def validate_radar_coverage(
    site_lat: float,
    site_lon: float,
    max_range_km: float = 250.0,
    target_bounds: Optional[Dict[str, float]] = None
) -> Tuple[bool, float, str]:
    """
    Validates whether an ISRO DWR radar site covers the target grid region.
    Returns (is_covered, distance_to_grid_center_km, coverage_description).
    """
    bounds = target_bounds or {
        "min_lat": 15.5, "max_lat": 19.5,
        "min_lon": 76.5, "max_lon": 81.5
    }
    center_lat = (bounds["min_lat"] + bounds["max_lat"]) / 2.0
    center_lon = (bounds["min_lon"] + bounds["max_lon"]) / 2.0

    dist_to_center = calculate_haversine_distance_km(site_lat, site_lon, center_lat, center_lon)

    # Check distance to closest boundary point of the grid rectangle
    closest_lat = max(bounds["min_lat"], min(site_lat, bounds["max_lat"]))
    closest_lon = max(bounds["min_lon"], min(site_lon, bounds["max_lon"]))
    dist_to_nearest_edge = calculate_haversine_distance_km(site_lat, site_lon, closest_lat, closest_lon)

    if dist_to_nearest_edge > max_range_km:
        return False, dist_to_center, f"Out of Range: Radar site ({site_lat:.2f}N, {site_lon:.2f}E) is {dist_to_nearest_edge:.1f} km from grid boundary (> {max_range_km:.0f} km max range)"
    elif dist_to_center <= max_range_km:
        return True, dist_to_center, f"Full Coverage: Radar site ({site_lat:.2f}N, {site_lon:.2f}E) is {dist_to_center:.1f} km from grid center"
    else:
        return True, dist_to_center, f"Partial Coverage: Radar site ({site_lat:.2f}N, {site_lon:.2f}E) is {dist_to_nearest_edge:.1f} km from grid boundary (covers regional sector)"

def validate_radar_response(response: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Validates ISRO DWR response payload.
    Returns (True, None) if valid, or (False, error_reason) if invalid.
    """
    if not isinstance(response, dict):
        return False, "Response must be a valid JSON dictionary"

    if "status_code" in response and response["status_code"] >= 400:
        err = response.get("error", f"HTTP {response['status_code']}")
        return False, f"ISRO DWR API returned error status {response['status_code']}: {err}"

    data = response.get("data") or response

    if not isinstance(data, dict):
        return False, "Radar payload data field must be a dictionary"

    # Check for reflectivity array/scalar or image
    has_dbz = "reflectivity_dbz" in data or "grid_dbz" in data or "max_dbz" in data or "dbz" in data
    has_image = "image_url" in data or "base64_image" in data

    if not (has_dbz or has_image):
        return False, "Radar payload missing reflectivity observations or raster grid"

    # Check latitude/longitude coordinates if present
    lat = data.get("latitude", data.get("site_lat"))
    lon = data.get("longitude", data.get("site_lon"))
    if lat is not None and not (-90.0 <= float(lat) <= 90.0):
        return False, f"Invalid radar site latitude: {lat}"
    if lon is not None and not (-180.0 <= float(lon) <= 180.0):
        return False, f"Invalid radar site longitude: {lon}"

    return True, None
