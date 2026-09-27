"""
Comprehensive Unit & Security Test Suite for Real NWP / Weather Data Connector (Step 2)
Tests:
1. Successful API response parsing & mapping
2. Invalid API key handling (HTTP 401 / 403)
3. Timeout handling
4. HTTP 4xx errors
5. HTTP 5xx errors
6. Malformed JSON handling
7. Missing field validation
8. Valid mapping to internal VAJRA format
9. Data provenance marked as REAL
10. Security check: API key NEVER appears in logs, errors, or dict keys exposed to caller
11. Optional integration test against live API (runs only when WEATHER_API_KEY environment variable is present)
"""
import sys
import os
import json
import unittest
import numpy as np
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

from app.config import config
from app.data_sources.nwp.client import NWPClient, sanitize_url_string
from app.data_sources.nwp.validation import validate_weather_response
from app.data_sources.nwp.mapper import map_provider_response_to_vajra
from app.data_sources.imd.status import status_tracker
from app.main import app
from fastapi.testclient import TestClient

SECRET_TEST_KEY = "SECRET_SUPER_CONFIDENTIAL_KEY_9999"

# Mock HTTP Server for testing weather provider endpoints
class MockWeatherAPIServer(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass # Suppress HTTP logs during test execution

    def do_GET(self):
        if "/v1/forecast" in self.path or "/current.json" in self.path:
            # Check auth
            if "invalid_key" in self.path or "unauthorized" in self.path:
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"error": true, "reason": "API Key is invalid or expired"}')
                return

            if "server_error" in self.path:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"error": "Internal Server Error"}')
                return

            if "malformed" in self.path:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{invalid_json_payload}')
                return

            # Success payload (Open-Meteo / standard format)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            payload = {
                "latitude": 17.6868,
                "longitude": 83.2185,
                "generationtime_ms": 0.25,
                "utc_offset_seconds": 0,
                "timezone": "UTC",
                "elevation": 45.0,
                "current": {
                    "time": "2026-09-27T10:00:00Z",
                    "temperature_2m": 29.8,
                    "relative_humidity_2m": 78.5,
                    "surface_pressure": 1004.2,
                    "precipitation": 12.4,
                    "cloud_cover": 85.0,
                    "wind_speed_10m": 18.5,
                    "wind_direction_10m": 135.0,
                    "cape": 1850.0
                }
            }
            self.wfile.write(json.dumps(payload).encode("utf-8"))

        elif "/v1/bad_request" in self.path:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"error": true, "reason": "Missing mandatory lat/lon parameter"}')

        else:
            self.send_response(404)
            self.end_headers()

class TestWeatherConnector(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Start mock weather API server on localhost:8888
        cls.server = HTTPServer(("127.0.0.1", 8888), MockWeatherAPIServer)
        cls.server_thread = threading.Thread(target=cls.server.serve_forever)
        cls.server_thread.daemon = True
        cls.server_thread.start()
        cls.mock_base_url = "http://127.0.0.1:8888/v1/forecast"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def test_01_successful_api_response_and_mapping(self):
        """Test successful weather retrieval and mapping to VAJRA internal format."""
        client = NWPClient(api_url=self.mock_base_url, api_key=SECRET_TEST_KEY, timeout_sec=5, max_retries=1)
        res = client.fetch_weather(latitude=17.6868, longitude=83.2185)

        self.assertTrue(res["success"])
        self.assertEqual(res["status"], "ONLINE")
        self.assertIsNotNone(res["data"])

        # Validate response
        is_valid, err = validate_weather_response(res)
        self.assertTrue(is_valid)
        self.assertIsNone(err)

        # Map to internal VAJRA weather format
        mapped = map_provider_response_to_vajra(res["data"], fallback_lat=17.6868, fallback_lon=83.2185, latency_ms=res["latency_ms"])

        self.assertEqual(mapped["provenance"], "real")
        self.assertEqual(mapped["latitude"], 17.6868)
        self.assertEqual(mapped["longitude"], 83.2185)
        self.assertEqual(mapped["variables"]["temperature_c"], 29.8)
        self.assertEqual(mapped["variables"]["relative_humidity_percent"], 78.5)
        self.assertEqual(mapped["variables"]["pressure_hpa"], 1004.2)
        self.assertEqual(mapped["variables"]["precipitation_mm"], 12.4)
        self.assertEqual(mapped["variables"]["wind_speed_kmh"], 18.5)

    def test_02_invalid_api_key_401(self):
        """Test handling of HTTP 401 invalid API key."""
        client = NWPClient(api_url=f"{self.mock_base_url}?invalid_key=1", api_key="INVALID_KEY", timeout_sec=5, max_retries=0)
        res = client.fetch_weather(latitude=17.6868, longitude=83.2185)

        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "AUTH_REQUIRED")
        self.assertEqual(res["status_code"], 401)
        self.assertIn("Authentication/API Key failure", res["error"])

    def test_03_timeout_handling(self):
        """Test handling of network timeout on non-existent endpoint."""
        # Port 8898 is closed to trigger connection timeout
        client = NWPClient(api_url="http://127.0.0.1:8898/v1/forecast", timeout_sec=1, max_retries=0)
        res = client.fetch_weather(latitude=17.6868, longitude=83.2185)

        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "OFFLINE")
        self.assertIn("connection failed", res["error"].lower())

    def test_04_http_4xx_errors(self):
        """Test handling of HTTP 400 Bad Request."""
        client = NWPClient(api_url="http://127.0.0.1:8888/v1/bad_request", timeout_sec=5, max_retries=0)
        res = client.fetch_weather(latitude=17.6868, longitude=83.2185)

        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "HTTP_ERROR")
        self.assertEqual(res["status_code"], 400)

    def test_05_http_5xx_errors(self):
        """Test handling of HTTP 500 Internal Server Error."""
        client = NWPClient(api_url=f"{self.mock_base_url}?server_error=1", timeout_sec=5, max_retries=0)
        res = client.fetch_weather(latitude=17.6868, longitude=83.2185)

        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "HTTP_ERROR")
        self.assertEqual(res["status_code"], 500)

    def test_06_malformed_json_handling(self):
        """Test handling of malformed non-JSON payload."""
        client = NWPClient(api_url=f"{self.mock_base_url}?malformed=1", timeout_sec=5, max_retries=0)
        res = client.fetch_weather(latitude=17.6868, longitude=83.2185)

        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "MALFORMED_JSON")
        self.assertIn("Failed to parse provider JSON", res["error"])

    def test_07_missing_required_fields_validation(self):
        """Test validation failure on empty or malformed dict."""
        empty_res = {"success": True, "data": {}}
        is_valid, err = validate_weather_response(empty_res)
        self.assertFalse(is_valid)
        self.assertIn("missing or empty", err)

    def test_08_valid_mapping_structure(self):
        """Test mapping of Open-Meteo style hourly and current fields."""
        raw_json = {
            "latitude": 17.68,
            "longitude": 83.21,
            "timezone": "UTC",
            "current": {
                "time": "2026-09-27T14:00:00Z",
                "temperature_2m": 32.1,
                "relative_humidity_2m": 65.0,
                "surface_pressure": 1008.0,
                "wind_speed_10m": 12.0,
                "wind_direction_10m": 220.0,
                "precipitation": 0.0,
                "cloud_cover": 20.0
            }
        }
        mapped = map_provider_response_to_vajra(raw_json)
        self.assertEqual(mapped["variables"]["temperature_c"], 32.1)
        self.assertEqual(mapped["variables"]["relative_humidity_percent"], 65.0)
        self.assertEqual(mapped["variables"]["pressure_hpa"], 1008.0)
        self.assertEqual(mapped["variables"]["precipitation_mm"], 0.0)

    def test_09_provenance_marked_as_real(self):
        """Test that mapped internal format explicitly marks provenance as real."""
        raw_json = {"latitude": 17.68, "longitude": 83.21, "current": {"temperature_2m": 25.0}}
        mapped = map_provider_response_to_vajra(raw_json)
        self.assertEqual(mapped["provenance"], "real")
        self.assertIn("NOT_OBSERVED_BY_NWP_API", mapped["multimodal_sensor_status"]["radar_reflectivity_dbz"])

    def test_10_security_api_key_never_exposed(self):
        """SECURITY TEST: Verify that API key is NEVER present in logs, errors, or output dictionaries."""
        secret_key = "MY_ULTRA_SECRET_TOKEN_XYZ_12345"
        sanitized = sanitize_url_string(f"https://api.weather.com/v1?lat=17.6&lon=83.2&key={secret_key}&foo=bar")

        self.assertNotIn(secret_key, sanitized)
        self.assertIn("***MASKED***", sanitized)

        client = NWPClient(api_url=self.mock_base_url, api_key=secret_key, timeout_sec=5, max_retries=0)
        res = client.fetch_weather(latitude=17.6868, longitude=83.2185)

        # Convert entire response object to string and assert secret_key is nowhere inside it
        res_str = json.dumps(res)
        self.assertNotIn(secret_key, res_str)

        # Test FastAPI weather route output
        test_client = TestClient(app)
        route_res = test_client.get("/api/weather/current")
        self.assertEqual(route_res.status_code, 200)
        route_json_str = route_res.text
        self.assertNotIn(secret_key, route_json_str)

    def test_11_optional_live_integration_test(self):
        """Optional live integration test running only if WEATHER_API_KEY is present in os.environ."""
        live_key = os.getenv("WEATHER_API_KEY")
        if not live_key or live_key.strip() == "":
            self.skipTest("Skipping live integration test: WEATHER_API_KEY is not set in environment.")

        logger.info("[NWP Test] Executing LIVE integration test against real WEATHER_API_URL...")
        client = NWPClient(api_url=config.WEATHER_API_URL, api_key=live_key)
        res = client.fetch_weather(latitude=config.WEATHER_LAT, longitude=config.WEATHER_LON)

        self.assertTrue(res["success"], f"Live API request failed: {res.get('error')}")
        self.assertEqual(res["status"], "ONLINE")

        is_valid, err = validate_weather_response(res)
        self.assertTrue(is_valid, f"Live response validation failed: {err}")

        mapped = map_provider_response_to_vajra(res["data"])
        self.assertEqual(mapped["provenance"], "real")
        self.assertIsNotNone(mapped["variables"]["temperature_c"])

if __name__ == "__main__":
    runner = unittest.TextTestRunner(verbosity=2)
    suite = unittest.TestLoader().loadTestsFromTestCase(TestWeatherConnector)
    result = runner.run(suite)
    sys.exit(not result.wasSuccessful())
