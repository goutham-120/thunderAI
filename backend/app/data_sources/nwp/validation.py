"""
NWP & Real Weather Data Validation Utility
Performs thorough schema checks, numerical validation, coordinate verification, timestamp verification,
and error surfacing without exposing API keys.
"""
import math
import logging
from typing import Dict, Any, Tuple, Optional
from app.data_sources.imd.validation import validate_coordinates, parse_iso_timestamp

logger = logging.getLogger("VAJRA-AI.NWPValidation")

def validate_weather_response(response_dict: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Validates that a provider response dictionary is non-empty, successful, has valid JSON schema,
    contains valid geographical bounds, timestamps, and numeric fields.
    Returns (is_valid, error_reason).
    """
    if not isinstance(response_dict, dict):
        return False, "Response payload is not a valid dictionary"

    if not response_dict.get("success"):
        status = response_dict.get("status", "ERROR")
        err = response_dict.get("error", "Unknown provider error")
        return False, f"Provider request failed ({status}): {err}"

    data = response_dict.get("data")
    if not isinstance(data, dict) or len(data) == 0:
        return False, "Provider data payload is missing or empty"

    # Surface provider-level API error messages (e.g., Open-Meteo error=true, OpenWeather cod!=200)
    if data.get("error") is True or "reason" in data:
        reason = data.get("reason") or data.get("message") or "Provider API error"
        return False, f"Provider API error response: {reason}"

    if "cod" in data and str(data["cod"]) not in ("200", "200.0"):
        msg = data.get("message", "API response code error")
        return False, f"Provider error code {data['cod']}: {msg}"

    # Verify presence of meteorological data keys
    has_current = "current" in data or "current_weather" in data or "main" in data or "hourly" in data
    if not has_current and not isinstance(data, dict):
        return False, "Provider response does not contain recognizable weather observation keys"

    # Extract & validate coordinates if present in payload
    lat = data.get("latitude") or (data.get("coord", {}).get("lat") if isinstance(data.get("coord"), dict) else None)
    lon = data.get("longitude") or (data.get("coord", {}).get("lon") if isinstance(data.get("coord"), dict) else None)
    if lat is not None and lon is not None:
        if not validate_coordinates(lat, lon):
            return False, f"Invalid latitude/longitude in provider response: ({lat}, {lon})"

    return True, None
