"""
IITM / IMD Lightning Detection Network API Client
Connects to IITM Damini / IMD Lightning sensors to fetch real-time lightning strike events.

SECURITY MANDATE:
- NEVER hard-code credentials.
- NEVER return synthetic lightning strikes and label them REAL.
- If credentials or API access are unconfigured, return status=UNAVAILABLE, reason=LIGHTNING_ACCESS_NOT_CONFIGURED.
"""
import time
import logging
import urllib.request
import urllib.error
import json
import os
from typing import Dict, Any, Optional
from app.config import config
from app.data_sources.imd.status import status_tracker
from app.services.lightning.validation import validate_lightning_response
from app.services.lightning.processor import process_lightning_strikes

logger = logging.getLogger("VAJRA-AI.LightningClient")

class LightningClient:
    def __init__(self):
        self.username = os.getenv("LIGHTNING_USERNAME", "")
        self.password = os.getenv("LIGHTNING_PASSWORD", "")
        self.api_url = os.getenv("LIGHTNING_API_URL", config.IMD_LIGHTNING_API_URL)
        self.network_id = os.getenv("LIGHTNING_NETWORK_ID", "IITM_DAMINI_LLN")
        self.timeout = config.IMD_REQUEST_TIMEOUT_SEC
        self.max_retries = 3

    def is_configured(self) -> bool:
        """
        Checks whether Lightning API access credentials and URL are fully configured.
        Returns False if any required credential or endpoint URL is missing.
        """
        username = os.getenv("LIGHTNING_USERNAME", self.username)
        password = os.getenv("LIGHTNING_PASSWORD", self.password)
        api_url = os.getenv("LIGHTNING_API_URL", self.api_url)
        return bool(username and password and api_url)

    def get_status(self) -> Dict[str, Any]:
        """
        Returns structured status summary for Lightning Detection Network ingestion.
        """
        if not self.is_configured():
            return {
                "source": "IITM / IMD Damini Lightning Network",
                "network_id": self.network_id,
                "status": "UNAVAILABLE",
                "reason": "LIGHTNING_ACCESS_NOT_CONFIGURED",
                "provenance": "NONE",
                "coverage": "Indian Subcontinent"
            }

        track = status_tracker.get_source_status("lightning")
        st = track.get("status", "UNCONFIGURED")
        prov = "REAL" if st in ("AVAILABLE", "REAL", "CONNECTED") else "NONE"

        return {
            "source": "IITM / IMD Damini Lightning Network",
            "network_id": self.network_id,
            "status": "AVAILABLE" if st in ("AVAILABLE", "REAL", "CONNECTED") else "UNAVAILABLE",
            "reason": track.get("error_message") if st not in ("AVAILABLE", "REAL", "CONNECTED") else None,
            "provenance": prov,
            "coverage": "Indian Subcontinent"
        }

    def fetch_lightning_strikes(
        self,
        latitude: float = config.OPEN_METEO_LAT,
        longitude: float = config.OPEN_METEO_LON
    ) -> Dict[str, Any]:
        """
        Retrieves real IITM / IMD Damini lightning strike detection events.
        If credentials/API URL are missing, returns status=UNAVAILABLE with reason=LIGHTNING_ACCESS_NOT_CONFIGURED.
        DOES NOT generate fake lightning observations.
        """
        if not self.is_configured():
            logger.info("[LightningClient] Access not configured (missing credentials or API URL). Returning UNAVAILABLE.")
            status_tracker.update_source(
                source_key="lightning",
                status="UNAVAILABLE",
                error_message="LIGHTNING_ACCESS_NOT_CONFIGURED"
            )
            return {
                "status": "UNAVAILABLE",
                "reason": "LIGHTNING_ACCESS_NOT_CONFIGURED",
                "provenance": "NONE",
                "source": "IITM / IMD Damini Lightning Network",
                "network_id": self.network_id,
                "data": None
            }

        api_url = os.getenv("LIGHTNING_API_URL", self.api_url)
        target_url = f"{api_url}?lat={latitude}&lon={longitude}"
        headers = {
            "User-Agent": "VAJRA-AI-Lightning-Connector/1.0",
            "Accept": "application/json"
        }

        username = os.getenv("LIGHTNING_USERNAME", self.username)
        password = os.getenv("LIGHTNING_PASSWORD", self.password)
        if username and password:
            import base64
            auth_str = f"{username}:{password}"
            encoded = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
            headers["Authorization"] = f"Basic {encoded}"

        last_error = ""
        attempt = 0
        start_time = time.time()

        while attempt < self.max_retries:
            attempt += 1
            try:
                req = urllib.request.Request(target_url, headers=headers, method="GET")
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    latency = (time.time() - start_time) * 1000.0
                    body = resp.read().decode("utf-8")
                    data_json = json.loads(body)
                    data_json["latency_ms"] = latency
                    data_json["status_code"] = resp.status

                    is_valid, err_msg = validate_lightning_response(data_json)
                    if is_valid:
                        raw_list = data_json.get("data") or data_json.get("strikes") or []
                        if isinstance(data_json, list):
                            raw_list = data_json

                        processed = process_lightning_strikes(raw_list, target_bounds=config.GRID_BOUNDS)
                        status_tracker.update_source(
                            source_key="lightning",
                            status="AVAILABLE",
                            latency_ms=latency,
                            records_count=processed["processed_strikes_count"],
                            latest_obs_time=processed["timestamp"]
                        )
                        return {
                            "status": "AVAILABLE",
                            "provenance": "REAL",
                            "source": "IITM / IMD Damini Lightning Network",
                            "network_id": self.network_id,
                            "strikes_count": processed["processed_strikes_count"],
                            "data": processed,
                            "latency_ms": latency
                        }
                    else:
                        last_error = f"Lightning payload validation failed: {err_msg}"
            except Exception as e:
                last_error = f"Lightning Request Error: {str(e)}"

            time.sleep(0.5)

        latency = (time.time() - start_time) * 1000.0
        status_tracker.update_source(
            source_key="lightning",
            status="UNAVAILABLE",
            latency_ms=latency,
            error_message=last_error
        )
        return {
            "status": "UNAVAILABLE",
            "reason": last_error or "LIGHTNING_REQUEST_FAILED",
            "provenance": "NONE",
            "source": "IITM / IMD Damini Lightning Network",
            "network_id": self.network_id,
            "data": None
        }

lightning_client = LightningClient()
