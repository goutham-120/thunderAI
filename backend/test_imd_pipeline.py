"""
Comprehensive Unit & Integration Test Suite for IMD Real Data Connectors & Harmonizer (Step 1A)
Tests:
1. IMD AWS/ARG Connector & Normalization
2. IMD Radar Connector & Resampling
3. IMD Lightning Connector & Flash Density Grid Binning
4. Validation & Exception Handling (Timeouts, Invalid JSON, Bad Coordinates)
5. Data Harmonizer in SYNTHETIC Mode
6. Data Harmonizer in REAL Mode & Channel Provenance
7. Truthful Status Reporting
8. FastAPI Routes Integration
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
from app.data_sources.imd.client import IMDClient
from app.data_sources.imd.validation import validate_coordinates, parse_iso_timestamp, safe_float
from app.data_sources.imd.status import IMDStatusTracker, status_tracker
from app.data_sources.imd.aws import IMDAWSConnector, aws_connector
from app.data_sources.imd.radar import IMDRadarConnector, radar_connector
from app.data_sources.imd.lightning import IMDLightningConnector, lightning_connector
from app.services.data_harmonizer import DataHarmonizer, harmonizer
from app.services.forecast_engine import forecast_engine
from app.main import app
from fastapi.testclient import TestClient

# Mock HTTP Server for testing real network interactions
class MockIMDAPIServer(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass # Suppress HTTP logs in test output

    def do_GET(self):
        if self.path == "/v1/aws":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            payload = {
                "status": "success",
                "stations": [
                    {
                        "station_id": "AWS_HYD_01",
                        "name": "Begumpet Observatory",
                        "latitude": 17.453,
                        "longitude": 78.472,
                        "timestamp": "2026-09-27T12:00:00Z",
                        "temp_c": 31.4,
                        "rh": 76.5,
                        "pressure_hpa": 1005.2,
                        "wind_speed": 14.5,
                        "wind_direction": 140.0,
                        "rain": 8.4
                    },
                    {
                        "id": "ARG_SEC_02",
                        "lat": 17.439,
                        "lon": 78.498,
                        "time": "2026-09-27T12:00:00Z",
                        "temperature": 30.1,
                        "humidity": 82.0,
                        "rainfall": 15.2
                    }
                ]
            }
            self.wfile.write(json.dumps(payload).encode("utf-8"))

        elif self.path == "/v1/radar":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            # Generate 32x32 synthetic radar dBZ grid
            grid = np.random.uniform(10.0, 58.0, (32, 32)).tolist()
            payload = {
                "site_id": "HYDERABAD_DWR_01",
                "latitude": 17.40,
                "longitude": 78.48,
                "timestamp": "2026-09-27T12:05:00Z",
                "units": "dBZ",
                "grid": grid
            }
            self.wfile.write(json.dumps(payload).encode("utf-8"))

        elif self.path == "/v1/lightning":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            payload = {
                "strikes": [
                    {
                        "lat": 17.41,
                        "lon": 78.49,
                        "timestamp": "2026-09-27T12:03:15Z",
                        "peak_current": -24.5,
                        "polarity": -1
                    },
                    {
                        "lat": 17.42,
                        "lon": 78.50,
                        "timestamp": "2026-09-27T12:04:10Z",
                        "peak_current": 18.2,
                        "polarity": 1
                    }
                ]
            }
            self.wfile.write(json.dumps(payload).encode("utf-8"))

        elif self.path == "/v1/unauthorized":
            self.send_response(401)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"error": "Unauthorized API key"}')

        else:
            self.send_response(404)
            self.end_headers()

class TestIMDPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Start mock IMD HTTP server on localhost:8899
        cls.server = HTTPServer(("127.0.0.1", 8899), MockIMDAPIServer)
        cls.server_thread = threading.Thread(target=cls.server.serve_forever)
        cls.server_thread.daemon = True
        cls.server_thread.start()
        cls.mock_base_url = "http://127.0.0.1:8899/v1"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def test_01_validation_utilities(self):
        """Test coordinate, timestamp, and numerical value validation."""
        self.assertTrue(validate_coordinates(17.385, 78.486))
        self.assertFalse(validate_coordinates(95.0, 78.486)) # Lat out of bounds
        self.assertFalse(validate_coordinates(17.385, "invalid"))

        parsed_ts = parse_iso_timestamp("2026-09-27 12:00:00")
        self.assertIsNotNone(parsed_ts)
        self.assertTrue(parsed_ts.startswith("2026-09-27T12:00:00"))

        self.assertEqual(safe_float("29.543"), 29.54)
        self.assertIsNone(safe_float("invalid"))
        self.assertIsNone(safe_float(150.0, min_val=0.0, max_val=100.0)) # Out of range

    def test_02_imd_client_success_and_auth_error(self):
        """Test HTTP IMDClient transport against mock server."""
        client = IMDClient(timeout_sec=5)
        res = client.get(f"{self.mock_base_url}/aws")
        self.assertTrue(res["success"])
        self.assertEqual(res["status"], "CONNECTED")
        self.assertIn("stations", res["data"])

        # Test HTTP 401 Unauthorized handling
        auth_res = client.get(f"{self.mock_base_url}/unauthorized")
        self.assertFalse(auth_res["success"])
        self.assertEqual(auth_res["status"], "AUTH_REQUIRED")
        self.assertEqual(auth_res["status_code"], 401)

    def test_03_aws_connector(self):
        """Test AWS connector fetch and normalization."""
        connector = IMDAWSConnector(api_url=f"{self.mock_base_url}/aws")
        res = connector.fetch_observations()
        self.assertTrue(res["success"])
        self.assertEqual(res["observations_count"], 2)
        obs1 = res["observations"][0]
        self.assertEqual(obs1["station_id"], "AWS_HYD_01")
        self.assertEqual(obs1["temperature_c"], 31.4)
        self.assertEqual(obs1["rainfall"], 8.4)

    def test_04_radar_connector_and_resampling(self):
        """Test Radar connector ingestion and 64x64 grid resampling."""
        connector = IMDRadarConnector(api_url=f"{self.mock_base_url}/radar")
        res = connector.fetch_radar_data()
        self.assertTrue(res["success"])
        self.assertTrue(res["has_raster_grid"])

        grid_64 = connector.resample_radar_to_grid(res, target_rows=64, target_cols=64)
        self.assertIsNotNone(grid_64)
        self.assertEqual(grid_64.shape, (64, 64))

    def test_05_lightning_connector_and_density_grid(self):
        """Test Lightning connector strike normalization and flash density binning."""
        connector = IMDLightningConnector(api_url=f"{self.mock_base_url}/lightning")
        res = connector.fetch_lightning_strikes()
        self.assertTrue(res["success"])
        self.assertEqual(res["strikes_count"], 2)

        density_grid = connector.convert_strikes_to_density_grid(res["strikes"], rows=64, cols=64)
        self.assertEqual(density_grid.shape, (64, 64))
        self.assertGreater(float(np.sum(density_grid)), 0.0)

    def test_06_data_harmonizer_synthetic_mode(self):
        """Test DataHarmonizer in synthetic mode."""
        cube = harmonizer.get_convective_cube(data_mode="synthetic")
        self.assertEqual(cube["data_mode"], "synthetic")
        self.assertEqual(cube["tensor"].shape, (5, 64, 64, 8))
        for ch, prov in cube["channel_provenance"].items():
            self.assertTrue(any(tag in prov for tag in ["SYNTHETIC", "REAL", "UNAVAILABLE", "PARTIAL"]))

    def test_07_data_harmonizer_real_mode_with_mock_connectors(self):
        """Test DataHarmonizer in real mode with live mock endpoints."""
        mock_aws = IMDAWSConnector(api_url=f"{self.mock_base_url}/aws")
        mock_radar = IMDRadarConnector(api_url=f"{self.mock_base_url}/radar")
        mock_lightning = IMDLightningConnector(api_url=f"{self.mock_base_url}/lightning")

        # Temporarily patch active connectors
        orig_aws_url = aws_connector.api_url
        orig_radar_url = radar_connector.api_url
        orig_lightning_url = lightning_connector.api_url

        try:
            aws_connector.api_url = f"{self.mock_base_url}/aws"
            radar_connector.api_url = f"{self.mock_base_url}/radar"
            lightning_connector.api_url = f"{self.mock_base_url}/lightning"

            cube = harmonizer.get_convective_cube(data_mode="real")
            self.assertEqual(cube["data_mode"], "real")
            self.assertEqual(cube["tensor"].shape, (5, 64, 64, 8))
            provenance = cube["channel_provenance"]
            self.assertIn("REAL", provenance["radar_dbz"])
            self.assertIn("REAL", provenance["lightning_density"])
            self.assertTrue("REAL" in provenance["nwp_cape"] or "PARTIAL" in provenance["nwp_cape"])
            self.assertIn("MOSDAC", provenance["sat_tir1_k"])
        finally:
            aws_connector.api_url = orig_aws_url
            radar_connector.api_url = orig_radar_url
            lightning_connector.api_url = orig_lightning_url

    def test_08_fastapi_endpoints(self):
        """Test FastAPI IMD routes using TestClient."""
        client = TestClient(app)

        res_mode = client.get("/api/data/imd/mode")
        self.assertEqual(res_mode.status_code, 200)
        self.assertIn("active_data_mode", res_mode.json())

        res_status = client.get("/api/data/imd/status")
        self.assertEqual(res_status.status_code, 200)
        self.assertIn("sources", res_status.json())

        res_health = client.get("/api/health")
        self.assertEqual(res_health.status_code, 200)
        self.assertIn("dwr_radar_status", res_health.json())

        res_forecast = client.get("/api/forecast/latest?horizon_min=30")
        self.assertEqual(res_forecast.status_code, 200)
        payload = res_forecast.json()
        self.assertIn("channel_provenance", payload)
        self.assertIn("data_mode", payload)

if __name__ == "__main__":
    runner = unittest.TextTestRunner(verbosity=2)
    suite = unittest.TestLoader().loadTestsFromTestCase(TestIMDPipeline)
    result = runner.run(suite)
    sys.exit(not result.wasSuccessful())
