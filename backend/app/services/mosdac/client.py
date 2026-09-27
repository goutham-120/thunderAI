"""
MOSDAC Satellite Data API Client (Step 2 & 3)
Connects to ISRO MOSDAC portal to query and ingest:
1. INSAT-3D/3DR/3DS L1B Imager (TIR1 10.8µm Cloud-Top Temp, TIR2 12.0µm, WV 6.8µm Water Vapour)
2. INSAT-3D Sounder Atmospheric Profiles
3. GSMaP ISRO Rain (0.1° Satellite Precipitation)

SECURITY MANDATE:
- NEVER hard-code credentials.
- NEVER print, log, or commit credentials.
- NEVER return synthetic satellite data and label it REAL.
- If credentials or API access are unconfigured, return status=UNAVAILABLE, reason=MOSDAC_ACCESS_NOT_CONFIGURED.
"""
import time
import logging
import urllib.request
import urllib.error
import json
from typing import Dict, Any, Optional
from app.config import config
from app.data_sources.imd.status import status_tracker
from app.services.mosdac.validation import validate_mosdac_response
from app.services.mosdac.parser import parse_gsmap_data, parse_insat_observations

logger = logging.getLogger("VAJRA-AI.MOSDACClient")

class MOSDACClient:
    def __init__(self):
        self.username = config.MOSDAC_USERNAME
        self.password = config.MOSDAC_PASSWORD
        self.api_url = config.MOSDAC_API_URL
        self.dataset_id = config.MOSDAC_DATASET_ID
        self.timeout = config.MOSDAC_REQUEST_TIMEOUT_SEC
        self.max_retries = config.MOSDAC_MAX_RETRIES

    def is_configured(self) -> bool:
        """
        Checks whether MOSDAC API access credentials and URL are fully configured.
        Returns False if any required credential or endpoint URL is missing.
        """
        username = config.MOSDAC_USERNAME or self.username
        password = config.MOSDAC_PASSWORD or self.password
        api_url = config.MOSDAC_API_URL or self.api_url
        return bool(username and password and api_url)

    def get_status(self) -> Dict[str, Any]:
        """
        Returns structured status summary for MOSDAC Satellite products.
        """
        if not self.is_configured():
            return {
                "source": "ISRO Satellite",
                "products": {
                    "insat_3d_tir1": "UNAVAILABLE",
                    "insat_3d_tir2": "UNAVAILABLE",
                    "insat_3d_wv": "UNAVAILABLE",
                    "insat_3d_sounder": "UNAVAILABLE",
                    "gsmap_rain": "UNAVAILABLE"
                },
                "status": "UNAVAILABLE",
                "reason": "MOSDAC_ACCESS_NOT_CONFIGURED",
                "provenance": "NONE",
                "resolution": "4 km (INSAT Imager) / 10 km (Sounder) / 0.1 degree (GSMaP)",
                "temporal_resolution": "30 min (INSAT) / hourly (GSMaP)",
                "coverage": "Indian Subcontinent & Bay of Bengal"
            }
        
        track = status_tracker.get_source_status("mosdac_gsmap")
        st = track.get("status", "UNCONFIGURED")
        prov = "REAL" if st in ("AVAILABLE", "REAL", "CONNECTED") else "NONE"

        return {
            "source": "MOSDAC",
            "products": {
                "insat_3d_tir1": st,
                "insat_3d_tir2": st,
                "insat_3d_wv": st,
                "insat_3d_sounder": st,
                "gsmap_rain": st
            },
            "status": "AVAILABLE" if st in ("AVAILABLE", "REAL", "CONNECTED") else "UNAVAILABLE",
            "reason": track.get("error_message") if st not in ("AVAILABLE", "REAL", "CONNECTED") else None,
            "provenance": prov,
            "resolution": "4 km (INSAT Imager) / 10 km (Sounder) / 0.1 degree (GSMaP)",
            "temporal_resolution": "30 min (INSAT) / hourly (GSMaP)",
            "coverage": "Indian Subcontinent & Bay of Bengal"
        }

    def fetch_insat_observations(
        self,
        latitude: float = config.OPEN_METEO_LAT,
        longitude: float = config.OPEN_METEO_LON
    ) -> Dict[str, Any]:
        """
        Retrieves real INSAT-3D/3DR/3DS TIR1 (10.8µm), TIR2 (12.0µm), Water Vapor (6.8µm), and Sounder profile data from MOSDAC.
        If credentials/API URL are missing, returns status=UNAVAILABLE with reason=MOSDAC_ACCESS_NOT_CONFIGURED.
        DOES NOT generate fake satellite observations.
        """
        if not self.is_configured():
            logger.info("[MOSDACClient] INSAT access not configured. Returning UNAVAILABLE.")
            status_tracker.update_source(
                source_key="mosdac_gsmap",
                status="UNAVAILABLE",
                error_message="MOSDAC_ACCESS_NOT_CONFIGURED"
            )
            return {
                "status": "UNAVAILABLE",
                "reason": "MOSDAC_ACCESS_NOT_CONFIGURED",
                "provenance": "NONE",
                "source": "ISRO Satellite",
                "product": "INSAT-3D/3DR L1B Imager",
                "resolution": "4 km (Imager) / 10 km (Sounder)",
                "data": None
            }

        target_url = f"{config.MOSDAC_API_URL or self.api_url}?dataset=INSAT_3D_L1B&lat={latitude}&lon={longitude}"
        headers = {
            "User-Agent": "VAJRA-AI-MOSDAC-Connector/1.0",
            "Accept": "application/json"
        }

        if (config.MOSDAC_USERNAME or self.username) and (config.MOSDAC_PASSWORD or self.password):
            import base64
            auth_str = f"{config.MOSDAC_USERNAME or self.username}:{config.MOSDAC_PASSWORD or self.password}"
            encoded = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
            headers["Authorization"] = f"Basic {encoded}"

        last_error = ""
        attempt = 0
        start_time = time.time()

        while attempt < (config.MOSDAC_MAX_RETRIES or self.max_retries):
            attempt += 1
            try:
                req = urllib.request.Request(target_url, headers=headers, method="GET")
                with urllib.request.urlopen(req, timeout=config.MOSDAC_REQUEST_TIMEOUT_SEC or self.timeout) as resp:
                    latency = (time.time() - start_time) * 1000.0
                    body = resp.read().decode("utf-8")
                    data_json = json.loads(body)
                    data_json["latency_ms"] = latency
                    data_json["status_code"] = resp.status

                    is_valid, err_msg = validate_mosdac_response(data_json)
                    if is_valid:
                        parsed = parse_insat_observations(data_json, target_bounds=config.GRID_BOUNDS)
                        prov = parsed.get("provenance", "REAL")
                        status_tracker.update_source(
                            source_key="mosdac_gsmap",
                            status="AVAILABLE",
                            latency_ms=latency,
                            records_count=1,
                            latest_obs_time=parsed["timestamp"]
                        )
                        return {
                            "status": "AVAILABLE",
                            "provenance": prov,
                            "source": "ISRO Satellite",
                            "product": "INSAT-3D/3DR L1B Imager",
                            "resolution": "4 km (Imager) / 10 km (Sounder)",
                            "temporal_resolution": "30 min",
                            "coverage": "Indian Subcontinent & Bay of Bengal",
                            "data": parsed,
                            "latency_ms": latency
                        }
                    else:
                        last_error = f"MOSDAC INSAT payload validation failed: {err_msg}"
            except Exception as e:
                last_error = f"INSAT Request Error: {str(e)}"

            time.sleep(0.5)

        latency = (time.time() - start_time) * 1000.0
        status_tracker.update_source(
            source_key="mosdac_gsmap",
            status="UNAVAILABLE",
            latency_ms=latency,
            error_message=last_error
        )
        return {
            "status": "UNAVAILABLE",
            "reason": last_error or "MOSDAC_INSAT_REQUEST_FAILED",
            "provenance": "NONE",
            "source": "MOSDAC",
            "product": "INSAT-3D/3DR L1B Imager",
            "resolution": "4 km",
            "data": None
        }

    def fetch_gsmap_precipitation(
        self,
        latitude: float = config.OPEN_METEO_LAT,
        longitude: float = config.OPEN_METEO_LON
    ) -> Dict[str, Any]:
        """
        Retrieves real MOSDAC GSMaP ISRO Rain satellite precipitation for specified lat/lon coordinates.
        If credentials/API URL are missing, returns status=UNAVAILABLE with reason=MOSDAC_ACCESS_NOT_CONFIGURED.
        DOES NOT generate fake satellite observations.
        """
        if not self.is_configured():
            logger.info("[MOSDACClient] GSMaP access not configured. Returning UNAVAILABLE.")
            status_tracker.update_source(
                source_key="mosdac_gsmap",
                status="UNAVAILABLE",
                error_message="MOSDAC_ACCESS_NOT_CONFIGURED"
            )
            return {
                "status": "UNAVAILABLE",
                "reason": "MOSDAC_ACCESS_NOT_CONFIGURED",
                "provenance": "NONE",
                "source": "ISRO Satellite",
                "product": "GSMaP ISRO Rain",
                "resolution": "0.1 degree",
                "temporal_resolution": "hourly",
                "coverage": "Indian Subcontinent",
                "latitude": latitude,
                "longitude": longitude,
                "data": None
            }

        target_url = f"{config.MOSDAC_API_URL or self.api_url}?dataset={config.MOSDAC_DATASET_ID or self.dataset_id}&lat={latitude}&lon={longitude}"
        headers = {
            "User-Agent": "VAJRA-AI-MOSDAC-Connector/1.0",
            "Accept": "application/json"
        }

        if (config.MOSDAC_USERNAME or self.username) and (config.MOSDAC_PASSWORD or self.password):
            import base64
            auth_str = f"{config.MOSDAC_USERNAME or self.username}:{config.MOSDAC_PASSWORD or self.password}"
            encoded = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
            headers["Authorization"] = f"Basic {encoded}"

        last_error = ""
        attempt = 0
        start_time = time.time()

        while attempt < (config.MOSDAC_MAX_RETRIES or self.max_retries):
            attempt += 1
            try:
                req = urllib.request.Request(target_url, headers=headers, method="GET")
                with urllib.request.urlopen(req, timeout=config.MOSDAC_REQUEST_TIMEOUT_SEC or self.timeout) as resp:
                    latency = (time.time() - start_time) * 1000.0
                    body = resp.read().decode("utf-8")
                    data_json = json.loads(body)
                    data_json["latency_ms"] = latency
                    data_json["status_code"] = resp.status

                    is_valid, err_msg = validate_mosdac_response(data_json)
                    if is_valid:
                        parsed = parse_gsmap_data(data_json, target_lat=latitude, target_lon=longitude)
                        prov = parsed.get("provenance", "REAL")
                        status_tracker.update_source(
                            source_key="mosdac_gsmap",
                            status="AVAILABLE",
                            latency_ms=latency,
                            records_count=1,
                            latest_obs_time=parsed["timestamp"]
                        )
                        return {
                            "status": "AVAILABLE",
                            "provenance": prov,
                            "source": "ISRO Satellite",
                            "product": "GSMaP ISRO Rain",
                            "resolution": "0.1 degree",
                            "temporal_resolution": "hourly",
                            "coverage": "Indian Subcontinent",
                            "latitude": latitude,
                            "longitude": longitude,
                            "data": parsed,
                            "latency_ms": latency
                        }
                    else:
                        last_error = f"MOSDAC payload validation failed: {err_msg}"
            except Exception as e:
                last_error = f"GSMaP Request Error: {str(e)}"

            time.sleep(0.5)

        latency = (time.time() - start_time) * 1000.0
        status_tracker.update_source(
            source_key="mosdac_gsmap",
            status="UNAVAILABLE",
            latency_ms=latency,
            error_message=last_error
        )
        return {
            "status": "UNAVAILABLE",
            "reason": last_error or "MOSDAC_GSMAP_REQUEST_FAILED",
            "provenance": "NONE",
            "source": "ISRO Satellite",
            "product": "GSMaP ISRO Rain",
            "resolution": "0.1 degree",
            "temporal_resolution": "hourly",
            "coverage": "Indian Subcontinent",
            "latitude": latitude,
            "longitude": longitude,
            "data": None
        }

mosdac_client = MOSDACClient()
