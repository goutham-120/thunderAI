import sys
import os
import joblib
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.models.spatiotemporal_net import ai_engine, TORCH_AVAILABLE
if TORCH_AVAILABLE:
    import torch

def inspect_hgb():
    print("=" * 70)
    print("1. INSPECTING HISTGRADIENTBOOSTING MODEL (vajra_hgb_nowcast.joblib)")
    print("=" * 70)
    hgb_path = os.path.join(os.path.dirname(__file__), "..", "backend", "app", "weights", "vajra_hgb_nowcast.joblib")
    if not os.path.exists(hgb_path):
        print(f"HGB model not found at {hgb_path}")
        return

    model = joblib.load(hgb_path)
    print(f"Model object type: {type(model)}")

    if hasattr(model, "n_features_in_"):
        print(f"Expected number of input features (n_features_in_): {model.n_features_in_}")
    if hasattr(model, "feature_names_in_"):
        print(f"Feature names in model: {model.feature_names_in_}")
    if hasattr(model, "classes_"):
        print(f"Classes: {model.classes_}")

    # Test predicting dummy features
    # Try 4 features: [tir1, tir2, wv, btd]
    x_test = np.array([
        [280.0, 280.0, 240.0, 40.0],
        [220.0, 220.0, 215.0, 5.0], # Severe convective pixel
        [200.0, 198.0, 195.0, 5.0], # Very cold convective pixel (< 235K)
        [300.0, 298.0, 260.0, 40.0]  # Clear sky warm pixel
    ])

    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(x_test)
        print(f"\nTest prediction probabilities for dummy inputs:\n{probs}")

def inspect_convlstm():
    print("\n" + "=" * 70)
    print("2. INSPECTING CONVLSTM CHECKPOINT (vajra_spatiotemporal_v1.pt)")
    print("=" * 70)
    pt_path = os.path.join(os.path.dirname(__file__), "..", "backend", "app", "weights", "vajra_spatiotemporal_v1.pt")
    if not os.path.exists(pt_path):
        print(f"ConvLSTM checkpoint not found at {pt_path}")
        return

    if not TORCH_AVAILABLE:
        print("PyTorch not available in environment.")
        return

    ckpt = torch.load(pt_path, map_location="cpu", weights_only=False)
    print(f"Checkpoint object keys: {list(ckpt.keys()) if isinstance(ckpt, dict) else type(ckpt)}")

    if isinstance(ckpt, dict) and "state_dict" in ckpt:
        sd = ckpt["state_dict"]
        meta = ckpt.get("metadata", {})
        print(f"Checkpoint metadata: {meta}")
        print(f"State dict layer count: {len(sd)}")
        print("\nState dict layer key samples:")
        for k in list(sd.keys())[:10]:
            print(f"  {k}: shape {sd[k].shape}, min={sd[k].min():.4f}, max={sd[k].max():.4f}")

        # Check output heads weights
        if "prob_thunder_head.2.weight" in sd:
            w = sd["prob_thunder_head.2.weight"]
            b = sd["prob_thunder_head.2.bias"]
            print(f"\nThunder head final conv weight: shape={w.shape}, mean={w.mean():.4f}, min={w.min():.4f}, max={w.max():.4f}")
            print(f"Thunder head final conv bias: shape={b.shape}, val={b.numpy()}")

if __name__ == "__main__":
    inspect_hgb()
    inspect_convlstm()
