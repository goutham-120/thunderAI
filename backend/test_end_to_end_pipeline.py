"""
Comprehensive End-to-End Pipeline Unit Test Suite (Step 7)
Tests:
1. End-to-end data flow: Data Sources -> Harmonizer -> Multimodal Tensor -> ConvLSTM -> Forecast Engine -> API
2. Independent data source verification (Open-Meteo, MOSDAC, ISRO Radar, Lightning)
3. Timestamps integrity (observation_time, ingestion_time, forecast_generation_time, forecast_valid_time)
4. Model provenance & live status payloads via /api/system/status
5. Multi-horizon coverage (15, 30, 45, 60, 90, 120, 180 min)
6. Graceful degradation on missing connectors
"""
import sys
import os
import unittest
import numpy as np
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

from app.main import app
from app.config import config
from app.services.data_harmonizer import DataHarmonizer, harmonizer
from app.models.spatiotemporal_net import SpatioTemporalInferenceEngine, ai_engine
from app.services.forecast_engine import ForecastEngine, forecast_engine

class TestEndToEndPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_full_api_pipeline_response(self):
        """Test complete API flow from GET /api/forecast/latest."""
        response = self.client.get("/api/forecast/latest?horizon_min=30&event_id=LIVE")
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["horizon_minutes"], 30)

        # Provenance & AI Status
        self.assertIn("model_status", data)
        self.assertIn("inference_mode", data)
        self.assertIn("model_provenance", data)
        self.assertEqual(data["model_status"], "TRAINED")
        self.assertEqual(data["inference_mode"], "CONVLSTM")

        # Multi-channel status & quality
        self.assertIn("data_quality", data)
        self.assertIn("channel_status", data)
        self.assertIn("real_channels", data)
        self.assertIn("fallback_channels", data)
        self.assertTrue(data["is_valid"])

        # Timestamps
        self.assertIn("timestamps", data)
        ts = data["timestamps"]
        self.assertIn("observation_time", ts)
        self.assertIn("ingestion_time", ts)
        self.assertIn("forecast_generation_time", ts)
        self.assertIn("forecast_valid_time", ts)

        # Output layers & metrics
        self.assertIn("layers", data)
        self.assertIn("summary_metrics", data)
        self.assertIn("storm_cells", data)
        self.assertIn("cap_alerts", data)
        self.assertIn("xai_explanation", data)

    def test_02_system_status_endpoint(self):
        """Test concise final system-status API payload at GET /api/system/status."""
        response = self.client.get("/api/system/status")
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data["status"], "OPERATIONAL")
        self.assertIn("data_sources", data)
        self.assertIn("ai_model", data)
        self.assertIn("timestamps", data)

        ds = data["data_sources"]
        self.assertEqual(ds["ecmwf_nwp"], "REAL") # Open-Meteo ECMWF live
        self.assertEqual(ds["isro_satellite"], "UNAVAILABLE") # Unconfigured credential fallback
        self.assertEqual(ds["isro_radar"], "UNAVAILABLE") # Unconfigured credential fallback
        self.assertEqual(ds["lightning"], "UNAVAILABLE") # Unconfigured credential fallback

        ai = data["ai_model"]
        self.assertEqual(ai["model_status"], "TRAINED")
        self.assertEqual(ai["inference_mode"], "CONVLSTM")

    def test_03_all_horizons_execution(self):
        """Test forecast generation for all 7 lead time horizons (15, 30, 45, 60, 90, 120, 180 min)."""
        horizons = [15, 30, 45, 60, 90, 120, 180]
        for h in horizons:
            response = self.client.get(f"/api/forecast/latest?horizon_min={h}")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["horizon_minutes"], h)
            self.assertIn("timestamps", data)

    def test_04_benchmark_validation_status(self):
        """Test GET /api/metrics/benchmark contains explicit validation pending status."""
        response = self.client.get("/api/metrics/benchmark")
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data["validation_status"], "Validation pending real historical labelled dataset")
        self.assertFalse(data["is_measured_empirical_benchmark"])
        self.assertIn("disclaimer", data)

    def test_05_graceful_degradation_on_connector_failure(self):
        """Verify pipeline handles unconfigured/failed connectors without crashing."""
        cube = harmonizer.get_convective_cube(data_mode="real")
        self.assertEqual(cube["data_mode"], "real")
        self.assertEqual(cube["tensor"].shape, (5, 64, 64, 8))
        self.assertTrue(cube["is_valid"])

        # ConvLSTM predictions on real cube
        preds = ai_engine.predict_horizons(cube["tensor"], horizons_min=[30])
        self.assertIn(30, preds)
        self.assertEqual(preds[30]["p_thunderstorm"].shape, (64, 64))

if __name__ == "__main__":
    unittest.main()
