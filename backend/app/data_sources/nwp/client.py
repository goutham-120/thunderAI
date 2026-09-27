"""
Real NWP / Weather Data API Transport Client
Connects securely to real weather/NWP providers using configuration and environment variables.

SECURITY MANDATES:
- NEVER hard-code, log, print, or expose API keys.
- Mask/sanitize secrets before logging or raising exceptions.
"""
import time
import json
import re
import logging
import urllib.request
import urllib.parse
import urllib.error
from typing import Dict, Any, Optional
from app.config import config

logger = logging.getLogger("VAJRA-AI.NWPClient")
logger.setLevel(logging.INFO)

def sanitize_url_string(url_or_text: str) -> str:
    """Strips out sensitive API keys from URL strings or log messages."""
    if not url_or_text:
        return ""
    # Mask query parameters like key=..., apikey=..., appid=..., token=...
    sanitized = re.sub(
        r'((?:key|apikey|appid|token|api_key)=)([^&"\'\s]+)',
        r'\1***MASKED***',
        str(url_or_text),
        flags=re.IGNORECASE
    )
    return sanitized

class NWPClient:
    def __init__(
        self,
        api_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout_sec: Optional[int] = None,
        max_retries: Optional[int] = None
    ):
        self.api_url = api_url if api_url is not None else config.WEATHER_API_URL
        self.api_key = api_key if api_key is not None else config.WEATHER_API_KEY
        self.timeout_sec = timeout_sec if timeout_sec is not None else config.WEATHER_TIMEOUT_SEC
        self.max_retries = max_retries if max_retries is not None else config.WEATHER_MAX_RETRIES

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "User-Agent": "VAJRA-AI/1.0 NWP Nowcasting Client (MoES/IMD)",
            "Accept": "application/json"
        }
        if self.api_key and "open-meteo" not in self.api_url.lower():
            # For providers requiring header authentication
            headers["X-Api-Key"] = self.api_key
        return headers

    def build_request_url(self, latitude: float, longitude: float) -> str:
        """Constructs API endpoint request URL for the selected weather provider."""
        base_url = self.api_url.strip() if self.api_url else "https://api.open-meteo.com/v1/forecast"

        # Check provider format
        if "open-meteo" in base_url.lower():
            params = {
                "latitude": latitude,
                "longitude": longitude,
                "current": "temperature_2m,relative_humidity_2m,surface_pressure,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,cape",
                "hourly": "temperature_2m,relative_humidity_2m,precipitation,surface_pressure,cloud_cover,wind_speed_10m,cape",
                "timezone": "UTC"
            }
            if self.api_key:
                params["apikey"] = self.api_key
            query_string = urllib.parse.urlencode(params)
            return f"{base_url}?{query_string}"

        elif "weatherapi.com" in base_url.lower():
            params = {
                "q": f"{latitude},{longitude}",
                "key": self.api_key or ""
            }
            query_string = urllib.parse.urlencode(params)
            return f"{base_url}?{query_string}"

        elif "openweathermap.org" in base_url.lower():
            params = {
                "lat": latitude,
                "lon": longitude,
                "units": "metric",
                "appid": self.api_key or ""
            }
            query_string = urllib.parse.urlencode(params)
            return f"{base_url}?{query_string}"

        else:
            # Generic Weather Provider URL format
            sep = "&" if "?" in base_url else "?"
            params = {"lat": latitude, "lon": longitude, "latitude": latitude, "longitude": longitude}
            if self.api_key:
                params["key"] = self.api_key
            query_string = urllib.parse.urlencode(params)
            return f"{base_url}{sep}{query_string}"

    def fetch_weather(
        self,
        latitude: float = config.WEATHER_LAT,
        longitude: float = config.WEATHER_LON
    ) -> Dict[str, Any]:
        """
        Executes HTTP request to retrieve real weather observation and forecast variables.
        Returns a structured dictionary with status, parsed response, and latency.
        NEVER logs or exposes the API key.
        """
        target_url = self.build_request_url(latitude, longitude)
        safe_url = sanitize_url_string(target_url)

        logger.info(f"[NWP] Requesting real weather data from {safe_url}")

        headers = self._get_headers()
        attempt = 0
        backoff = 1.0

        while attempt <= self.max_retries:
            attempt += 1
            start_time = time.time()
            try:
                req = urllib.request.Request(target_url, headers=headers, method="GET")
                with urllib.request.urlopen(req, timeout=self.timeout_sec) as response:
                    latency_ms = round((time.time() - start_time) * 1000, 2)
                    status_code = response.status
                    raw_body = response.read()

                    logger.info(f"[NWP] Response received | Status: {status_code} | Latency: {latency_ms}ms")

                    try:
                        parsed_json = json.loads(raw_body.decode("utf-8"))
                    except Exception as json_err:
                        err_msg = f"Failed to parse provider JSON: {json_err}"
                        logger.error(f"[NWP] {err_msg}")
                        return {
                            "success": False,
                            "status": "MALFORMED_JSON",
                            "status_code": status_code,
                            "error": err_msg,
                            "data": None,
                            "latency_ms": latency_ms
                        }

                    return {
                        "success": True,
                        "status": "ONLINE",
                        "status_code": status_code,
                        "data": parsed_json,
                        "latency_ms": latency_ms,
                        "error": None
                    }

            except urllib.error.HTTPError as http_err:
                latency_ms = round((time.time() - start_time) * 1000, 2)
                sanitized_reason = sanitize_url_string(http_err.reason)
                err_msg = f"HTTP {http_err.code}: {sanitized_reason}"
                logger.error(f"[NWP] HTTP Error on {safe_url} (Attempt {attempt}/{self.max_retries + 1}): {err_msg}")

                if http_err.code in (401, 403):
                    return {
                        "success": False,
                        "status": "AUTH_REQUIRED",
                        "status_code": http_err.code,
                        "error": f"Authentication/API Key failure: HTTP {http_err.code}",
                        "data": None,
                        "latency_ms": latency_ms
                    }

                if http_err.code == 429:
                    return {
                        "success": False,
                        "status": "RATE_LIMITED",
                        "status_code": 429,
                        "error": "API rate limit exceeded",
                        "data": None,
                        "latency_ms": latency_ms
                    }

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
                sanitized_reason = sanitize_url_string(str(url_err.reason))
                err_msg = f"Network connection failed: {sanitized_reason}"
                logger.error(f"[NWP] Connection error on {safe_url} (Attempt {attempt}/{self.max_retries + 1}): {err_msg}")

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
                sanitized_ex = sanitize_url_string(str(ex))
                logger.error(f"[NWP] Unexpected transport error on {safe_url}: {sanitized_ex}")
                if attempt > self.max_retries:
                    return {
                        "success": False,
                        "status": "ERROR",
                        "error": f"Unexpected client error: {sanitized_ex}",
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

nwp_client = NWPClient()
