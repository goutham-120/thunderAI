"""
Audit ConvLSTM model outputs, logits, probability distributions, and loss behavior.
"""
import os
import sys
import torch
import numpy as np

backend_dir = r"c:\Users\nalla\OneDrive\Documents\Thunder\thunderAI\backend"
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.models.spatiotemporal_net import ai_engine, MultimodalSpatioTemporalModel

print("=== CONVLSTM DIAGNOSTIC AUDIT ===")
print("Torch available:", ai_engine.torch_available)
print("Model status:", ai_engine.model_status)
print("Inference mode:", ai_engine.inference_mode)

if ai_engine.model is not None:
    # Run a test forward pass on a 4D tensor
    dummy_4d = np.zeros((5, 64, 64, 8), dtype=np.float32)
    dummy_4d[:, :, :, 2] = 250.0 # TIR1 ~ -23°C in Kelvin
    dummy_4d[:, :, :, 3] = 230.0 # WV in Kelvin

    preds = ai_engine.predict_horizons(dummy_4d, horizons_min=[30], force_mode="CONVLSTM")
    pred_30 = preds[30]
    p_thu = pred_30["p_thunderstorm"]

    print("\nRaw ConvLSTM Output Summary for p_thunderstorm:")
    print("Shape:", p_thu.shape)
    print("Min probability:", float(p_thu.min()))
    print("Max probability:", float(p_thu.max()))
    print("Mean probability:", float(p_thu.mean()))
    print("Percentiles [10, 50, 90, 99]:", np.percentile(p_thu, [10, 50, 90, 99]))
    print("Count > 0.5 threshold:", np.sum(p_thu > 0.5))
    print("Count > 0.1 threshold:", np.sum(p_thu > 0.1))
