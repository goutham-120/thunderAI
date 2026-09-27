"""
Comprehensive Unit Test Suite for Step 6: ConvLSTM PyTorch AI Model Activation & Inference
Tests:
1. PyTorch ConvLSTM Encoder-Decoder architecture forward pass
2. Model weight checkpoint loading and state_dict validation
3. Multi-horizon prediction generation (15, 30, 45, 60, 90, 120, 180 min)
4. Missing/corrupted checkpoint error handling & fallback mode
5. Model provenance & API integration via /api/forecast/latest
"""
import sys
import os
import unittest
import numpy as np
import torch

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

from app.config import config
from app.models.spatiotemporal_net import (
    MultimodalSpatioTemporalModel,
    SpatioTemporalInferenceEngine,
    ai_engine
)
from app.services.forecast_engine import forecast_engine
from app.services.data_harmonizer import harmonizer

class TestConvLSTMModelActivation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.weights_path = os.path.join(os.path.dirname(__file__), "app", "weights", "vajra_spatiotemporal_v1.pt")

    def test_01_convlstm_forward_pass_dimensions(self):
        """Test ConvLSTM model forward pass output shapes."""
        model = MultimodalSpatioTemporalModel(in_channels=8, hidden_channels=32)
        model.eval()

        # Input: [Batch=1, T=5, C=8, H=64, W=64]
        x = torch.zeros(1, 5, 8, 64, 64, dtype=torch.float32)
        horizons = [15, 30, 60, 180]

        with torch.no_grad():
            outputs = model(x, horizons_min=horizons)

        self.assertIn(15, outputs)
        self.assertIn(30, outputs)
        self.assertIn(60, outputs)
        self.assertIn(180, outputs)

        out_30 = outputs[30]
        self.assertEqual(out_30["p_thunderstorm"].shape, (1, 1, 64, 64))
        self.assertEqual(out_30["p_lightning"].shape, (1, 1, 64, 64))
        self.assertEqual(out_30["rainfall_mmh"].shape, (1, 1, 64, 64))
        self.assertEqual(out_30["pred_dbz"].shape, (1, 1, 64, 64))

        # Check output value constraints
        self.assertTrue(torch.all(out_30["p_thunderstorm"] >= 0.0) and torch.all(out_30["p_thunderstorm"] <= 1.0))
        self.assertTrue(torch.all(out_30["p_lightning"] >= 0.0) and torch.all(out_30["p_lightning"] <= 1.0))
        self.assertTrue(torch.all(out_30["rainfall_mmh"] >= 0.0))
        self.assertTrue(torch.all(out_30["pred_dbz"] >= 0.0))

    def test_02_checkpoint_loading_and_state(self):
        """Test checkpoint loading and inference engine state."""
        engine = SpatioTemporalInferenceEngine(checkpoint_path=self.weights_path)
        self.assertTrue(engine.torch_available)
        self.assertEqual(engine.model_status, "TRAINED")
        self.assertEqual(engine.inference_mode, "CONVLSTM")
        self.assertIsNone(engine.checkpoint_error)

    def test_03_multi_horizon_convlstm_predictions(self):
        """Test real multi-horizon prediction generation from 4D spatiotemporal tensor."""
        engine = SpatioTemporalInferenceEngine(checkpoint_path=self.weights_path)
        cube = harmonizer.get_convective_cube(data_mode="synthetic")
        tensor_4d = cube["tensor"] # [5, 64, 64, 8]

        horizons = [15, 30, 45, 60, 90, 120, 180]
        preds = engine.predict_horizons(tensor_4d, horizons_min=horizons, force_mode="CONVLSTM")

        for h in horizons:
            self.assertIn(h, preds)
            p_h = preds[h]
            self.assertEqual(p_h["horizon_minutes"], h)
            self.assertEqual(p_h["pred_dbz"].shape, (64, 64))
            self.assertEqual(p_h["p_thunderstorm"].shape, (64, 64))
            self.assertEqual(p_h["p_lightning"].shape, (64, 64))
            self.assertEqual(p_h["rainfall_mmh"].shape, (64, 64))
            self.assertIn("PyTorch ConvLSTM", p_h["inference_engine"])

    def test_04_missing_checkpoint_fallback_handling(self):
        """Test missing checkpoint error handling and fallback behavior."""
        non_existent = os.path.join(os.path.dirname(__file__), "app", "weights", "non_existent_weights.pt")
        orig_fallback = config.ALLOW_SYNTHETIC_FALLBACK

        try:
            config.ALLOW_SYNTHETIC_FALLBACK = True
            engine = SpatioTemporalInferenceEngine(checkpoint_path=non_existent)
            self.assertEqual(engine.model_status, "MISSING_CHECKPOINT")
            self.assertEqual(engine.inference_mode, "HEURISTIC_FALLBACK")

            # Fallback prediction should still succeed without raising exception
            cube = harmonizer.get_convective_cube(data_mode="synthetic")
            preds = engine.predict_horizons(cube["tensor"], horizons_min=[30])
            self.assertIn("HEURISTIC_FALLBACK", preds[30]["inference_engine"])

            # When fallback is not allowed, should raise FileNotFoundError
            config.ALLOW_SYNTHETIC_FALLBACK = False
            with self.assertRaises(FileNotFoundError):
                SpatioTemporalInferenceEngine(checkpoint_path=non_existent)
        finally:
            config.ALLOW_SYNTHETIC_FALLBACK = orig_fallback

    def test_05_api_forecast_provenance_integration(self):
        """Test that /api/forecast/latest exposes ConvLSTM model status and provenance."""
        nowcast = forecast_engine.get_complete_nowcast(horizon_min=30, event_id="LIVE")

        self.assertEqual(nowcast["status"], "success")
        self.assertIn("model_status", nowcast)
        self.assertIn("inference_mode", nowcast)
        self.assertIn("model_provenance", nowcast)

        prov = nowcast["model_provenance"]
        self.assertEqual(prov["backbone"], "2-Layer ConvLSTM Encoder-Decoder")
        self.assertEqual(prov["input_channels"], 8)
        self.assertEqual(nowcast["inference_mode"], "CONVLSTM")
        self.assertEqual(nowcast["model_status"], "TRAINED")

if __name__ == "__main__":
    unittest.main()
