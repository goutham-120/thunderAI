"""
Open-Meteo ECMWF HTTP Transport Client
Ingests real 9 km ECMWF IFS HRES NWP data using standard Python HTTP stack.
Handles timeouts, retries, response parsing, error handling, and structured logging.
"""
import time
import json
import logging
import urllib.request
import urllib.parse
import urllib.error
from typing import Dict, Any, Optional
from app.config import config

logger = logging.getLogger("VAJRA-AI.OpenMeteoClient")
logger.setLevel(logging.INFO)

class OpenMeteoECMWFClient:
    def __init__(
        self,
        api_url: Optional[str] = None,
        timeout_sec: Optional[int] = None,
        max_retries: Optional[int] = None
    ):
        self.api_url = api_url if api_url is not None else config.OPEN_METEO_API_URL
        self.timeout_sec = timeout_sec if timeout_sec is not None else config.OPEN_METEO_TIMEOUT_SEC
        self.max_retries = max_retries if max_retries is not None else config.OPEN_METEO_MAX_RETRIES

    def build_request_url(self, latitude: float, longitude: float, variables: str) -> str:
        base = self.api_url.strip() if self.api_url else "https://api.open-meteo.com/v1/ecmwf"
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "hourly": variables,
            "timezone": "UTC"
        }
        query_string = urllib.parse.urlencode(params)
        return f"{base}?{query_string}"

    def fetch_ecmwf_forecast(
        self,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Retrieves real ECMWF IFS HRES forecast variables from Open-Meteo API.
        Logs request start, status, timestamp count, variables, and model metadata.
        """
        lat = latitude if latitude is not None else config.OPEN_METEO_LAT
        lon = longitude if longitude is not None else config.OPEN_METEO_LON
        vars_str = config.OPEN_METEO_VARIABLES

        target_url = self.build_request_url(lat, lon, vars_str)
        logger.info(f"[Open-Meteo] [START] Requesting ECMWF NWP forecast | URL: {target_url}")

        attempt = 0
        backoff = 1.0
        headers = {
            "User-Agent": "VAJRA-AI/1.0 ECMWF Ingestion Engine (MoES/IMD)",
            "Accept": "application/json"
        }

        while attempt <= self.max_retries:
            attempt += 1
            start_time = time.time()
            try:
                req = urllib.request.Request(target_url, headers=headers, method="GET")
                with urllib.request.urlopen(req, timeout=self.timeout_sec) as response:
                    latency_ms = round((time.time() - start_time) * 1000, 2)
                    status_code = response.status
                    raw_body = response.read()

                    logger.info(f"[Open-Meteo] [RESPONSE] HTTP {status_code} | Latency: {latency_ms}ms")

                    try:
                        parsed_json = json.loads(raw_body.decode("utf-8"))
                    except Exception as parse_err:
                        err_msg = f"Failed to parse Open-Meteo JSON: {parse_err}"
                        logger.error(f"[Open-Meteo] {err_msg}")
                        return {
                            "success": False,
                            "status": "MALFORMED_JSON",
                            "status_code": status_code,
                            "error": err_msg,
                            "data": None,
                            "latency_ms": latency_ms
                        }

                    # Extract inspection metrics for logging
                    hourly = parsed_json.get("hourly", {})
                    time_array = hourly.get("time", []) if isinstance(hourly, dict) else []
                    received_vars = [k for k in hourly.keys() if k != "time"] if isinstance(hourly, dict) else []

                    logger.info(f"[Open-Meteo] [SUCCESS] Source: Open-Meteo | Model: ECMWF IFS HRES (9 km)")
                    logger.info(f"[Open-Meteo] Received {len(time_array)} hourly records across {len(received_vars)} variables: {received_vars}")

                    return {
                        "success": True,
                        "status": "REAL",
                        "status_code": status_code,
                        "data": parsed_json,
                        "hourly_count": len(time_array),
                        "variables_count": len(received_vars),
                        "latency_ms": latency_ms,
                        "error": None
                    }

            except urllib.error.HTTPError as http_err:
                latency_ms = round((time.time() - start_time) * 1000, 2)
                err_msg = f"HTTP {http_err.code}: {http_err.reason}"
                logger.error(f"[Open-Meteo] HTTP Error on request (Attempt {attempt}/{self.max_retries + 1}): {err_msg}")

                if attempt > self.max_retries:
                    return {
                        "success": False,
                        "status": "HTTP_ERROR",
                        "status_code": http_err.code,
                        "error": err_msg,
                        "data": None,
                        "latency_ms": latency_ms
                    }

            except urllib.error.URLError as url_err:
                latency_ms = round((time.time() - start_time) * 1000, 2)
                err_msg = f"Network connection failed: {url_err.reason}"
                logger.error(f"[Open-Meteo] Connection Error (Attempt {attempt}/{self.max_retries + 1}): {err_msg}")

                if attempt > self.max_retries:
                    return {
                        "success": False,
                        "status": "OFFLINE",
                        "error": err_msg,
                        "data": None,
                        "latency_ms": latency_ms
                    }

            except Exception as ex:
                latency_ms = round((time.time() - start_time) * 1000, 2)
                err_msg = f"Unexpected client error: {ex}"
                logger.error(f"[Open-Meteo] Error: {err_msg}")
                if attempt > self.max_retries:
                    return {
                        "success": False,
                        "status": "ERROR",
                        "error": err_msg,
                        "data": None,
                        "latency_ms": latency_ms
                    }

            time.sleep(backoff)
            backoff *= 1.5

        return {
            "success": False,
            "status": "OFFLINE",
            "error": "Maximum retries exceeded",
            "data": None,
            "latency_ms": 0.0
        }

open_meteo_client = OpenMeteoECMWFClient()
