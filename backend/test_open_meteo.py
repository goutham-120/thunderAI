"""
Comprehensive Automated Test Suite for Open-Meteo ECMWF Real NWP Ingestion (Step 2)
Tests:
1. Successful API response parsing & ECMWF mapping
2. Malformed JSON handling
3. Missing variable validation
4. Mismatched hourly array length validation
5. Network timeout handling
6. Fallback behavior (ALLOW_SYNTHETIC_FALLBACK)
7. Provenance & model metadata verification (ECMWF IFS HRES 9km)
8. Multimodal sensor isolation verification (No fake dBZ/lightning from precipitation)
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
from app.services.open_meteo.client import OpenMeteoECMWFClient, open_meteo_client
from app.services.open_meteo.validation import validate_open_meteo_response
from app.services.open_meteo.mapper import map_ecmwf_response_to_vajra
from app.services.data_harmonizer import DataHarmonizer, harmonizer
from app.data_sources.imd.status import status_tracker

# Mock Open-Meteo ECMWF HTTP Server
class MockOpenMeteoServer(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass # Suppress logs during test runner

    def do_GET(self):
        if "/v1/ecmwf" in self.path or "/v1/forecast" in self.path:
            if "malformed" in self.path:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{malformed_json_payload')
                return

            if "missing_var" in self.path:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                payload = {
                    "latitude": 17.68,
                    "longitude": 83.20,
                    "hourly": {
                        "time": ["2026-09-27T10:00:00Z"],
                        "temperature_2m": [28.5]
                        # missing other requested variables
                    }
                }
                self.wfile.write(json.dumps(payload).encode("utf-8"))
                return

            if "mismatched_len" in self.path:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                payload = {
                    "latitude": 17.68,
                    "longitude": 83.20,
                    "hourly": {
                        "time": ["2026-09-27T10:00:00Z", "2026-09-27T11:00:00Z"],
                        "temperature_2m": [28.5], # len=1 vs len=2
                        "relative_humidity_2m": [75.0, 78.0]
                    }
                }
                self.wfile.write(json.dumps(payload).encode("utf-8"))
                return

            # Success valid ECMWF response
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            payload = {
                "latitude": 17.68014,
                "longitude": 83.204254,
                "elevation": 45.0,
                "timezone": "UTC",
                "hourly_units": {
                    "temperature_2m": "°C",
                    "relative_humidity_2m": "%",
                    "precipitation": "mm",
                    "cape": "J/kg"
                },
                "hourly": {
                    "time": ["2026-09-27T10:00:00Z", "2026-09-27T11:00:00Z", "2026-09-27T12:00:00Z"],
                    "temperature_2m": [29.5, 30.1, 31.0],
                    "relative_humidity_2m": [78.0, 75.0, 70.0],
                    "dew_point_2m": [25.2, 25.0, 24.8],
                    "precipitation": [5.2, 12.4, 18.0],
                    "cloud_cover": [85.0, 90.0, 95.0],
                    "wind_speed_10m": [15.0, 18.0, 22.0],
                    "wind_speed_100m": [25.0, 30.0, 35.0],
                    "wind_speed_200m": [40.0, 50.0, 60.0],
                    "cape": [1850.0, 2200.0, 2450.0],
                    "convective_inhibition": [20.0, 15.0, 10.0],
                    "total_column_integrated_water_vapour": [52.0, 55.0, 58.0]
                }
            }
            self.wfile.write(json.dumps(payload).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

class TestOpenMeteoECMWF(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = HTTPServer(("127.0.0.1", 8877), MockOpenMeteoServer)
        cls.server_thread = threading.Thread(target=cls.server.serve_forever)
        cls.server_thread.daemon = True
        cls.server_thread.start()
        cls.mock_url = "http://127.0.0.1:8877/v1/ecmwf"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def test_01_successful_api_response_and_mapping(self):
        """Test successful Open-Meteo ECMWF ingestion and mapping."""
        client = OpenMeteoECMWFClient(api_url=self.mock_url, timeout_sec=5, max_retries=1)
        res = client.fetch_ecmwf_forecast(latitude=17.68014, longitude=83.204254)

        self.assertTrue(res["success"])
        self.assertEqual(res["status"], "REAL")
        self.assertEqual(res["hourly_count"], 3)

        is_valid, err = validate_open_meteo_response(res)
        self.assertTrue(is_valid, f"Validation failed: {err}")

        mapped = map_ecmwf_response_to_vajra(res["data"])
        prov = mapped["provenance"]
        self.assertEqual(prov["source"], "Open-Meteo")
        self.assertEqual(prov["model"], "ECMWF IFS HRES")
        self.assertEqual(prov["resolution"], "9 km")
        self.assertEqual(prov["data_type"], "NWP forecast")
        self.assertEqual(prov["status"], "REAL")

        self.assertEqual(mapped["hourly_series"]["temperature_2m"][0], 29.5)
        self.assertIsNotNone(mapped["current_variables"]["temperature_2m"])

    def test_02_malformed_json(self):
        """Test handling of malformed non-JSON payload."""
        client = OpenMeteoECMWFClient(api_url=f"{self.mock_url}?malformed=1", timeout_sec=5, max_retries=0)
        res = client.fetch_ecmwf_forecast()

        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "MALFORMED_JSON")

    def test_03_missing_variable_validation(self):
        """Test validation failure when a requested variable is missing."""
        client = OpenMeteoECMWFClient(api_url=f"{self.mock_url}?missing_var=1", timeout_sec=5, max_retries=0)
        res = client.fetch_ecmwf_forecast()

        self.assertTrue(res["success"]) # HTTP 200
        is_valid, err = validate_open_meteo_response(res, expected_variables=["temperature_2m", "relative_humidity_2m"])
        self.assertFalse(is_valid)
        self.assertIn("missing", err)

    def test_04_mismatched_array_lengths(self):
        """Test validation failure when hourly array lengths do not match."""
        client = OpenMeteoECMWFClient(api_url=f"{self.mock_url}?mismatched_len=1", timeout_sec=5, max_retries=0)
        res = client.fetch_ecmwf_forecast()

        self.assertTrue(res["success"])
        is_valid, err = validate_open_meteo_response(res, expected_variables=["temperature_2m", "relative_humidity_2m"])
        self.assertFalse(is_valid)
        self.assertIn("Mismatched array length", err)

    def test_05_timeout_handling(self):
        """Test handling of network connection timeout."""
        client = OpenMeteoECMWFClient(api_url="http://127.0.0.1:8897/v1/ecmwf", timeout_sec=1, max_retries=0)
        res = client.fetch_ecmwf_forecast()

        self.assertFalse(res["success"])
        self.assertEqual(res["status"], "OFFLINE")

    def test_06_fallback_behavior_and_provenance(self):
        """Test fallback behavior when REAL request fails."""
        orig_url = open_meteo_client.api_url
        orig_fallback = config.ALLOW_SYNTHETIC_FALLBACK
        orig_retries = open_meteo_client.max_retries

        try:
            # Point to unreachable URL to force failure
            open_meteo_client.api_url = "http://127.0.0.1:8897/v1/ecmwf"
            open_meteo_client.max_retries = 0
            config.ALLOW_SYNTHETIC_FALLBACK = True

            cube = harmonizer.get_convective_cube(data_mode="real")
            self.assertEqual(cube["data_mode"], "real")
            self.assertIn("SYNTHETIC_FALLBACK", cube["channel_provenance"]["nwp_cape"])
            self.assertNotIn("REAL", cube["channel_provenance"]["nwp_cape"]) # MUST NOT claim real when fallback occurred!

            # Test ALLOW_SYNTHETIC_FALLBACK = False
            config.ALLOW_SYNTHETIC_FALLBACK = False
            with self.assertRaises(RuntimeError):
                harmonizer.get_convective_cube(data_mode="real")

        finally:
            open_meteo_client.api_url = orig_url
            open_meteo_client.max_retries = orig_retries
            config.ALLOW_SYNTHETIC_FALLBACK = orig_fallback

    def test_07_multimodal_sensor_isolation(self):
        """Test that weather variables (precipitation, clouds) are NOT mapped to radar/lightning/satellite."""
        raw_json = {
            "latitude": 17.68,
            "longitude": 83.20,
            "hourly": {
                "time": ["2026-09-27T10:00:00Z"],
                "precipitation": [50.0], # High precipitation
                "cloud_cover": [100.0]  # Full cloud cover
            }
        }
        mapped = map_ecmwf_response_to_vajra(raw_json)
        sensors = mapped["multimodal_sensor_status"]

        self.assertIn("UNAVAILABLE", sensors["radar_reflectivity_dbz"])
        self.assertIn("UNAVAILABLE", sensors["lightning_flash_density"])
        self.assertIn("UNAVAILABLE", sensors["satellite_tir_k"])

if __name__ == "__main__":
    runner = unittest.TextTestRunner(verbosity=2)
    suite = unittest.TestLoader().loadTestsFromTestCase(TestOpenMeteoECMWF)
    result = runner.run(suite)
    sys.exit(not result.wasSuccessful())
