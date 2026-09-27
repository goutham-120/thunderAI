"""
IITM / IMD Lightning Response Validator
Validates HTTP response structure and strike event data integrity for lightning detection feeds.
"""
from typing import Tuple, Dict, Any, Optional

def validate_lightning_response(response: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Validates lightning response payload.
    Returns (True, None) if valid, or (False, error_reason) if invalid.
    """
    if not isinstance(response, dict):
        return False, "Response must be a valid JSON dictionary"

    if "status_code" in response and response["status_code"] >= 400:
        err = response.get("error", f"HTTP {response['status_code']}")
        return False, f"Lightning API returned error status {response['status_code']}: {err}"

    data = response.get("data") or response.get("strikes") or response.get("flashes") or response

    if not isinstance(data, (dict, list)):
        return False, "Lightning payload missing valid strike list or data dictionary"

    return True, None
