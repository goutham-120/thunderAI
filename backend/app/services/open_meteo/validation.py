"""
Open-Meteo ECMWF Validation Module
Validates HTTP response, JSON structure, presence of hourly.time, requested variables,
array length consistency across hourly variables, and numeric validity.
"""
import math
import logging
from typing import Dict, Any, Tuple, Optional, List
from app.config import config

logger = logging.getLogger("VAJRA-AI.OpenMeteoValidation")

def validate_open_meteo_response(
    response_dict: Dict[str, Any],
    expected_variables: Optional[List[str]] = None
) -> Tuple[bool, Optional[str]]:
    """
    Validates ECMWF forecast response payload.
    Checks:
    1. HTTP status & success flag
    2. Presence of 'hourly' object and 'hourly.time'
    3. Presence of all requested forecast variables
    4. Identical array lengths across all hourly variables
    5. Numeric sanity (no NaN/Inf values)
    """
    if not isinstance(response_dict, dict):
        return False, "Response payload is not a dictionary"

    if not response_dict.get("success"):
        status = response_dict.get("status", "ERROR")
        err = response_dict.get("error", "Unknown transport error")
        return False, f"Open-Meteo request failed ({status}): {err}"

    data = response_dict.get("data")
    if not isinstance(data, dict):
        return False, "Data field is missing or not a JSON dictionary"

    if data.get("error") is True:
        reason = data.get("reason", "Open-Meteo API returned an error")
        return False, f"Open-Meteo API Error: {reason}"

    hourly = data.get("hourly")
    if not isinstance(hourly, dict):
        return False, "Missing or invalid 'hourly' object in Open-Meteo response"

    time_array = hourly.get("time")
    if not isinstance(time_array, list) or len(time_array) == 0:
        return False, "Missing or empty 'hourly.time' list in Open-Meteo response"

    expected_len = len(time_array)

    if expected_variables is None:
        expected_variables = [v.strip() for v in config.OPEN_METEO_VARIABLES.split(",") if v.strip()]

    # Validate presence and length of every expected variable
    for var in expected_variables:
        if var not in hourly:
            return False, f"Requested variable '{var}' is missing from Open-Meteo hourly response"

        var_array = hourly[var]
        if not isinstance(var_array, list):
            return False, f"Variable '{var}' is not a list in hourly payload"

        if len(var_array) != expected_len:
            return False, f"Mismatched array length for variable '{var}': expected {expected_len}, got {len(var_array)}"

    # Validate numeric values (ensure no NaNs or Infinities)
    for var in expected_variables:
        for idx, val in enumerate(hourly[var]):
            if val is not None:
                if isinstance(val, (int, float)):
                    if math.isnan(val) or math.isinf(val):
                        return False, f"Invalid NaN/Inf value in variable '{var}' at index {idx}"
                else:
                    return False, f"Non-numeric value '{val}' in variable '{var}' at index {idx}"

    return True, None
