"""
MOSDAC Satellite Response Validator
Validates HTTP response structure and data payload integrity for MOSDAC INSAT-3D/3DR/3DS Imager, Sounder, and GSMaP products.
"""
from typing import Tuple, Dict, Any, Optional

def validate_mosdac_response(response: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Validates MOSDAC response payload.
    Returns (True, None) if valid, or (False, error_reason) if invalid.
    """
    if not isinstance(response, dict):
        return False, "Response must be a valid JSON dictionary"

    if "status_code" in response and response["status_code"] >= 400:
        err = response.get("error", f"HTTP {response['status_code']}")
        return False, f"MOSDAC API returned error status {response['status_code']}: {err}"

    data = response.get("data") or response

    if not isinstance(data, dict):
        return False, "Payload data field must be a valid dictionary"

    # Verify data container presence (precipitation, imager channels, or sounder profile)
    has_precip = "precipitation" in data or "precip_mm" in data or "rain_rate" in data or "grid_data" in data
    has_imager = "tir1_temp_k" in data or "tir1" in data or "bt_tir1" in data or "water_vapor_k" in data or "wv" in data or "tir2" in data or "tir2_temp_k" in data
    has_sounder = "sounder_temp_profile" in data or "sounder_moisture" in data or "sounder" in data or "sounder_data" in data

    if not (has_precip or has_imager or has_sounder):
        return False, "Payload missing MOSDAC satellite observations (imager TIR1/WV/TIR2, sounder, or precipitation)"

    if "timestamp" in data and not data["timestamp"]:
        return False, "Data timestamp cannot be empty"

    lat = data.get("latitude", data.get("lat"))
    lon = data.get("longitude", data.get("lon"))
    if lat is not None:
        if not isinstance(lat, (int, float)) or not (-90.0 <= float(lat) <= 90.0):
            return False, f"Invalid latitude coordinate: {lat}"
    if lon is not None:
        if not isinstance(lon, (int, float)) or not (-180.0 <= float(lon) <= 180.0):
            return False, f"Invalid longitude coordinate: {lon}"

    precip = data.get("precipitation", data.get("precip_mm", data.get("rain_rate")))
    if precip is not None:
        if not isinstance(precip, (int, float)) or float(precip) < 0.0:
            return False, f"Invalid precipitation value (must be non-negative number): {precip}"

    return True, None
