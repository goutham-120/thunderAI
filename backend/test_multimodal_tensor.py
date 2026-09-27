"""
Comprehensive Unit Test Suite for Step 5: Multimodal Spatiotemporal AI Tensor Harmonization
Tests:
1. Spatiotemporal tensor shape [T=5, H=64, W=64, C=8] and 8-channel indexing.
2. Tensor quality validation (shape, non-NaN/Inf, value bounds per channel).
3. Rich metadata generation (channel_status, real_channels, fallback_channels, missing_channels, data_quality, is_valid).
4. Synthetic vs Real data mode cube generation.
5. Integration with ForecastEngine nowcast output.
"""
import sys
import os
import unittest
import numpy as np

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

from app.config import config
from app.services.data_harmonizer import DataHarmonizer, harmonizer
from app.services.forecast_engine import ForecastEngine, forecast_engine

class TestMultimodalTensorHarmonization(unittest.TestCase):
    def setUp(self):
        self.harmonizer = DataHarmonizer()
        self.expected_channel_names = [
            "radar_dbz", "radial_velocity", "sat_tir1_k", "sat_wv_k",
            "lightning_density", "nwp_cape", "nwp_cin", "nwp_shear"
        ]

    def test_01_spatiotemporal_tensor_shape_and_channels(self):
        """Verify tensor dimensions [T=5, H=64, W=64, C=8] and channel naming."""
        cube = self.harmonizer.get_convective_cube(data_mode="synthetic")
        tensor = cube["tensor"]

        self.assertIsInstance(tensor, np.ndarray)
        self.assertEqual(tensor.shape, (5, 64, 64, 8))
        self.assertEqual(cube["channel_names"], self.expected_channel_names)
        self.assertEqual(cube["tensor_shape"], [5, 64, 64, 8])
        self.assertTrue(cube["is_valid"])
        self.assertIsNone(cube["validation_error"])

    def test_02_tensor_quality_validation(self):
        """Test quality validation logic for clean vs invalid tensors."""
        # Clean valid tensor
        valid_tensor = np.zeros((5, 64, 64, 8), dtype=np.float32)
        valid_tensor[:, :, :, 2] = 290.0 # TIR1 inside [180, 330]
        valid_tensor[:, :, :, 3] = 240.0 # WV inside [180, 300]
        is_val, err = self.harmonizer.validate_tensor_quality(valid_tensor)
        self.assertTrue(is_val)
        self.assertIsNone(err)

        # Invalid type
        is_val, err = self.harmonizer.validate_tensor_quality([[1, 2], [3, 4]])
        self.assertFalse(is_val)
        self.assertIn("ndarray", err)

        # Invalid shape
        bad_shape_tensor = np.zeros((4, 64, 64, 8), dtype=np.float32)
        is_val, err = self.harmonizer.validate_tensor_quality(bad_shape_tensor)
        self.assertFalse(is_val)
        self.assertIn("Invalid tensor shape", err)

        # NaN injection
        nan_tensor = valid_tensor.copy()
        nan_tensor[0, 10, 10, 0] = np.nan
        is_val, err = self.harmonizer.validate_tensor_quality(nan_tensor)
        self.assertFalse(is_val)
        self.assertIn("NaN", err)

        # Inf injection
        inf_tensor = valid_tensor.copy()
        inf_tensor[0, 10, 10, 5] = np.inf
        is_val, err = self.harmonizer.validate_tensor_quality(inf_tensor)
        self.assertFalse(is_val)
        self.assertIn("Inf", err)

        # Out-of-bounds value
        oob_tensor = valid_tensor.copy()
        oob_tensor[0, 10, 10, 0] = 85.0 # Radar dBZ > 75
        is_val, err = self.harmonizer.validate_tensor_quality(oob_tensor)
        self.assertFalse(is_val)
        self.assertIn("dBZ", err)

    def test_03_metadata_generation_and_channel_statuses(self):
        """Test metadata construction, channel status tagging, and data quality categorization."""
        prov = {
            "radar_dbz": "SYNTHETIC_FALLBACK (ISRO DWR Not Configured)",
            "radial_velocity": "SYNTHETIC_FALLBACK (ISRO DWR Not Configured)",
            "sat_tir1_k": "SYNTHETIC_FALLBACK (MOSDAC Not Configured)",
            "sat_wv_k": "SYNTHETIC_FALLBACK (MOSDAC Not Configured)",
            "lightning_density": "SYNTHETIC_FALLBACK (Damini LLN Not Configured)",
            "nwp_cape": "REAL (Open-Meteo ECMWF IFS HRES 9km)",
            "nwp_cin": "REAL (Open-Meteo ECMWF IFS HRES 9km)",
            "nwp_shear": "REAL (Open-Meteo ECMWF Derived)"
        }
        dummy_tensor = np.zeros((5, 64, 64, 8), dtype=np.float32)
        dummy_tensor[:, :, :, 2] = 280.0
        dummy_tensor[:, :, :, 3] = 230.0

        meta = self.harmonizer._build_metadata_for_cube(
            tensor_4d=dummy_tensor,
            channel_provenance=prov,
            data_mode="synthetic"
        )

        self.assertEqual(meta["data_mode"], "synthetic")
        self.assertEqual(meta["data_quality"], "PARTIAL") # 3 real channels (Open-Meteo)
        self.assertTrue(meta["fallback_used"])
        self.assertIn("nwp_cape", meta["real_channels"])
        self.assertIn("nwp_cin", meta["real_channels"])
        self.assertIn("nwp_shear", meta["real_channels"])
        self.assertEqual(len(meta["real_channels"]), 3)
        self.assertEqual(len(meta["fallback_channels"]), 5)
        self.assertEqual(meta["channel_status"]["nwp_cape"], "REAL")
        self.assertEqual(meta["channel_status"]["radar_dbz"], "SYNTHETIC_FALLBACK")

    def test_04_synthetic_mode_vs_real_mode_cube(self):
        """Test cube generation in synthetic vs real data modes."""
        synth_cube = self.harmonizer.get_convective_cube(data_mode="synthetic")
        self.assertEqual(synth_cube["data_mode"], "synthetic")
        self.assertEqual(synth_cube["tensor"].shape, (5, 64, 64, 8))
        self.assertIn("channel_status", synth_cube)
        self.assertIn("data_quality", synth_cube)

        real_cube = self.harmonizer.get_convective_cube(data_mode="real")
        self.assertEqual(real_cube["data_mode"], "real")
        self.assertEqual(real_cube["tensor"].shape, (5, 64, 64, 8))
        self.assertIn("channel_status", real_cube)
        self.assertIn("data_quality", real_cube)

    def test_05_forecast_engine_integration(self):
        """Test that forecast_engine consumes harmonized cube and exposes metadata in nowcast endpoint."""
        nowcast = forecast_engine.get_complete_nowcast(horizon_min=30, event_id="LIVE")

        self.assertEqual(nowcast["status"], "success")
        self.assertIn("data_quality", nowcast)
        self.assertIn("is_valid", nowcast)
        self.assertIn("channel_status", nowcast)
        self.assertIn("real_channels", nowcast)
        self.assertIn("fallback_channels", nowcast)
        self.assertIn("missing_channels", nowcast)
        self.assertIn("fallback_used", nowcast)
        self.assertTrue(nowcast["is_valid"])

if __name__ == "__main__":
    unittest.main()
