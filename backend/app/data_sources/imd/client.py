"""
IMD API HTTP Client
Handles HTTP transport, timeout, authentication, retry logic, error handling, logging, and status tracking.
"""
import time
import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, Optional
from app.config import config

logger = logging.getLogger("VAJRA-AI.IMDClient")
logger.setLevel(logging.INFO)

class IMDClient:
    def __init__(
        self,
        api_key: Optional[str] = None,
        auth_token: Optional[str] = None,
        timeout_sec: Optional[int] = None
    ):
        self.api_key = api_key if api_key is not None else config.IMD_API_KEY
        self.auth_token = auth_token if auth_token is not None else config.IMD_AUTH_TOKEN
        self.timeout_sec = timeout_sec if timeout_sec is not None else config.IMD_REQUEST_TIMEOUT_SEC

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "User-Agent": "VAJRA-AI/1.0 Nowcasting Platform (MoES/IMD)",
            "Accept": "application/json, image/*, */*"
        }
        if self.api_key:
            headers["X-Api-Key"] = self.api_key
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        return headers

    def get(self, url: str, retries: int = 2) -> Dict[str, Any]:
        """
        Executes an HTTP GET request to the specified IMD API endpoint.
        Returns a standardized dictionary containing response data, HTTP status, latency, and error info.
        Does NOT fabricate fake data on failure.
        """
        if not url or url.strip() == "" or url == "[PASTE HERE]":
            logger.warning(f"[IMD] Endpoint URL is unconfigured: '{url}'")
            return {
                "success": False,
                "status": "NOT_CONFIGURED",
                "error": f"IMD endpoint URL is unconfigured: '{url}'",
                "data": None,
                "latency_ms": 0.0,
                "timestamp": None
            }

        headers = self._get_headers()
        attempt = 0
        backoff = 1.0

        masked_key = f"{self.api_key[:4]}***" if self.api_key else "None"
        logger.info(f"[IMD] Requesting endpoint: {url} (Auth Key: {masked_key})")

        while attempt <= retries:
            attempt += 1
            start_time = time.time()
            try:
                req = urllib.request.Request(url, headers=headers, method="GET")
                with urllib.request.urlopen(req, timeout=self.timeout_sec) as response:
                    latency_ms = round((time.time() - start_time) * 1000, 2)
                    status_code = response.status
                    content_type = response.headers.get("Content-Type", "").lower()
                    raw_body = response.read()

                    logger.info(f"[IMD] Response from {url} | Status: {status_code} | Latency: {latency_ms}ms")

                    parsed_data = None
                    if "json" in content_type or raw_body.strip().startswith(b"{") or raw_body.strip().startswith(b"["):
                        try:
                            parsed_data = json.loads(raw_body.decode("utf-8"))
                        except Exception as parse_err:
                            logger.error(f"[IMD] JSON parsing failed: {parse_err}")
                            return {
                                "success": False,
                                "status": "INVALID_FORMAT",
                                "error": f"Failed to parse JSON response: {str(parse_err)}",
                                "data": None,
                                "latency_ms": latency_ms
                            }
                    else:
                        # Raw binary / image data
                        parsed_data = {
                            "content_type": content_type,
                            "bytes": raw_body,
                            "length": len(raw_body)
                        }

                    return {
                        "success": True,
                        "status": "CONNECTED",
                        "status_code": status_code,
                        "data": parsed_data,
                        "latency_ms": latency_ms,
                        "error": None
                    }

            except urllib.error.HTTPError as http_err:
                latency_ms = round((time.time() - start_time) * 1000, 2)
                err_msg = f"HTTP {http_err.code}: {http_err.reason}"
                logger.error(f"[IMD] HTTP Error on {url} (Attempt {attempt}/{retries + 1}): {err_msg}")
                status_label = "AUTH_REQUIRED" if http_err.code in (401, 403) else "HTTP_ERROR"

                if http_err.code in (401, 403):
                    # Authentication issue: don't retry, return immediately
                    return {
                        "success": False,
                        "status": status_label,
                        "status_code": http_err.code,
                        "error": f"Authentication/authorization required: {err_msg}",
                        "data": None,
                        "latency_ms": latency_ms
                    }

                if attempt > retries:
                    return {
                        "success": False,
                        "status": status_label,
                        "status_code": http_err.code,
                        "error": err_msg,
                        "data": None,
                        "latency_ms": latency_ms
                    }

            except urllib.error.URLError as url_err:
                latency_ms = round((time.time() - start_time) * 1000, 2)
                err_msg = f"Connection failed: {url_err.reason}"
                logger.error(f"[IMD] URL Error on {url} (Attempt {attempt}/{retries + 1}): {err_msg}")

                if attempt > retries:
                    return {
                        "success": False,
                        "status": "UNAVAILABLE",
                        "error": err_msg,
                        "data": None,
                        "latency_ms": latency_ms
                    }

            except Exception as ex:
                latency_ms = round((time.time() - start_time) * 1000, 2)
                logger.error(f"[IMD] Unexpected error fetching {url}: {ex}")
                if attempt > retries:
                    return {
                        "success": False,
                        "status": "ERROR",
                        "error": str(ex),
                        "data": None,
                        "latency_ms": latency_ms
                    }

            time.sleep(backoff)
            backoff *= 1.5

        return {
            "success": False,
            "status": "UNAVAILABLE",
            "error": "Maximum retries exceeded",
            "data": None,
            "latency_ms": 0.0
        }

imd_client = IMDClient()
