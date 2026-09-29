import sys
import os
import joblib
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.services.insat_3ds_processor import insat_processor, ROI_BOUNDS

def compute_spatial_grad(arr):
    gy, gx = np.gradient(arr)
    return np.sqrt(gx**2 + gy**2)

def test_hgb_with_correct_features():
    print("=" * 80)
    print("TESTING HISTGRADIENTBOOSTING MODEL WITH EXACT 7 TRAINED FEATURES")
    print("=" * 80)

    hgb_path = os.path.join(os.path.dirname(__file__), "..", "backend", "app", "weights", "vajra_hgb_nowcast.joblib")
    hgb_model = joblib.load(hgb_path)
    print(f"Loaded HGB model from {hgb_path}")

    scans = insat_processor.scan_inventory()
    roi_name = "NATIONAL"

    if len(scans) < 2:
        print("Not enough scans to extract PrevCooling feature.")
        return

    # Extract scan 0 (t-1) and scan 1 (t0)
    f0 = insat_processor.read_and_calibrate_scan(scans[0]["filepath"], roi_name=roi_name, target_grid_size=(64, 64))
    f1 = insat_processor.read_and_calibrate_scan(scans[1]["filepath"], roi_name=roi_name, target_grid_size=(64, 64))

    t1_curr = f1["tir1_celsius"]
    t2_curr = f1["tir2_celsius"]
    wv_curr = f1["wv_celsius"]
    mir_curr = f1["mir_celsius"]
    split_curr = f1["split_window_diff"]
    grad_curr = compute_spatial_grad(t1_curr)
    prev_cool = f0["tir1_celsius"] - f1["tir1_celsius"] # Previous cooling rate

    # Stack into [4096, 7] feature matrix
    X_7feats = np.column_stack([
        t1_curr.flatten(),
        t2_curr.flatten(),
        wv_curr.flatten(),
        mir_curr.flatten(),
        split_curr.flatten(),
        grad_curr.flatten(),
        prev_cool.flatten()
    ])

    print(f"\nExtracted X_7feats matrix shape: {X_7feats.shape}")
    print(f"Feature means: {np.nanmean(X_7feats, axis=0)}")

    probs = hgb_model.predict_proba(X_7feats)[:, 1].reshape((64, 64))

    print(f"\nSUCCESS! HistGradientBoosting Probability Distribution:")
    print(f"  Min probability:  {np.min(probs):.6f}")
    print(f"  Max probability:  {np.max(probs):.6f}")
    print(f"  Mean probability: {np.mean(probs):.6f}")
    print(f"  Std probability:  {np.std(probs):.6f}")
    print(f"  Percentiles (P10, P50, P90, P99): {np.quantile(probs, [0.10, 0.50, 0.90, 0.99])}")
    print(f"  Number of positive pixels at threshold 0.35: {np.sum(probs >= 0.35)} / 4096")
    print(f"  Number of positive pixels at threshold 0.15: {np.sum(probs >= 0.15)} / 4096")
    print(f"  Number of positive pixels at threshold 0.10: {np.sum(probs >= 0.10)} / 4096")

if __name__ == "__main__":
    test_hgb_with_correct_features()
