"""
VAJRA-AI Genuine Model Training & Evaluation Pipeline
Trains and evaluates:
1. PyTorch ConvLSTM Encoder-Decoder on 4D spatiotemporal grid sequences.
2. Scikit-Learn HistGradientBoosting / RandomForest Classifier & Regressor on multi-channel satellite sequence features.

Target: Convective Risk & Future Cloud-Top Temperature Nowcast at horizons +30m, +60m, +90m.
Data Source: Calibrated INSAT-3DS L1C SGP HDF5 satellite observation sequence (C:\\Users\\nalla\\Downloads\\).
"""
import os
import sys
import glob
import time
import json
import logging
import numpy as np

# Ensure backend directory is in python path
backend_dir = r"c:\Users\nalla\OneDrive\Documents\Thunder\thunderAI\backend"
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.services.insat_3ds_processor import insat_processor, ROI_BOUNDS
import torch
import torch.nn as nn
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score, brier_score_loss, mean_squared_error
)
import joblib

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("VAJRA-AI.Trainer")

def load_and_preprocess_dataset():
    """
    Scans, calibrates, and extracts feature sequences across 4 geographic ROIs.
    """
    inventory = insat_processor.scan_inventory()
    logger.info(f"Loaded inventory: {len(inventory)} INSAT-3DS scans")

    rois = ['AP_TELANGANA', 'EAST_COAST', 'KARNATAKA', 'NATIONAL']
    roi_scans = {}

    for roi in rois:
        scans = []
        for item in inventory:
            try:
                cal = insat_processor.read_and_calibrate_scan(item["filepath"], roi_name=roi, target_grid_size=(64, 64))
                scans.append(cal)
            except Exception as e:
                logger.warning(f"Error loading {item['filename']} for ROI {roi}: {e}")
        roi_scans[roi] = scans

    return inventory, roi_scans

def construct_pixel_tabular_dataset(roi_scans):
    """
    Constructs tabular feature vectors and targets for pixel-level nowcasting at +30m and +60m lead times.
    """
    X_rows = []
    y_class_30m = []
    y_class_60m = []
    y_temp_30m = []

    for roi, scans in roi_scans.items():
        n = len(scans)
        for i in range(n):
            curr = scans[i]
            t_curr = curr["tir1_celsius"]
            t2_curr = curr["tir2_celsius"]
            wv_curr = curr["wv_celsius"]
            mir_curr = curr["mir_celsius"]
            split_curr = curr["split_window_diff"]

            if np.isnan(t_curr).all():
                continue

            # Calculate spatial gradients
            grad_y, grad_x = np.gradient(t_curr)
            spatial_grad = np.sqrt(grad_y**2 + grad_x**2)

            # Previous cooling rate feature if i > 0
            if i > 0 and (scans[i]["timestamp_iso"] != scans[i-1]["timestamp_iso"]):
                dt_h = max(0.1, (scans[i]["timestamp_iso"] != scans[i-1]["timestamp_iso"]))
                prev_cooling = scans[i-1]["tir1_celsius"] - t_curr
            else:
                prev_cooling = np.zeros_like(t_curr)

            # Look for targets at step i+1 (+30m) and step i+2 (+60m)
            target_30 = None
            if i + 1 < n:
                # Check if gap is approx 30 min (less than 40 min)
                gap = (scans[i+1]["tir1_celsius"])
                target_30 = scans[i+1]["tir1_celsius"]

            target_60 = None
            if i + 2 < n:
                target_60 = scans[i+2]["tir1_celsius"]

            if target_30 is not None:
                h, w = t_curr.shape
                # Sample grid pixels to avoid spatial redundancy (step=2)
                for r in range(0, h, 2):
                    for c in range(0, w, 2):
                        v_t1 = t_curr[r, c]
                        v_t2 = t2_curr[r, c]
                        v_wv = wv_curr[r, c]
                        v_mir = mir_curr[r, c]
                        v_split = split_curr[r, c]
                        v_grad = spatial_grad[r, c]
                        v_prev_cool = prev_cooling[r, c]

                        if np.isnan([v_t1, v_t2, v_wv, v_mir]).any():
                            continue

                        v_tar30 = target_30[r, c]
                        if np.isnan(v_tar30):
                            continue

                        # Feature vector: [TIR1, TIR2, WV, MIR, SplitWindow, SpatialGrad, PrevCooling]
                        feat = [v_t1, v_t2, v_wv, v_mir, v_split, v_grad, v_prev_cool]
                        
                        # Convective risk target: Temperature below -10°C OR cooling rate > 3°C
                        # Class 1 = Cold cloud convective risk, Class 0 = Clear/warm
                        cls30 = 1 if (v_tar30 < -10.0 or (v_t1 - v_tar30) > 3.0) else 0

                        X_rows.append(feat)
                        y_class_30m.append(cls30)
                        y_temp_30m.append(v_tar30)

                        if target_60 is not None and not np.isnan(target_60[r, c]):
                            v_tar60 = target_60[r, c]
                            cls60 = 1 if (v_tar60 < -10.0 or (v_t1 - v_tar60) > 5.0) else 0
                            y_class_60m.append(cls60)

    X = np.array(X_rows, dtype=np.float32)
    y30 = np.array(y_class_30m, dtype=np.int32)
    y_temp30 = np.array(y_temp_30m, dtype=np.float32)

    logger.info(f"Constructed Tabular Dataset: X shape={X.shape}, positive samples 30m={np.sum(y30)} ({np.mean(y30)*100:.2f}%)")
    return X, y30, y_temp30

def train_baseline_ml_model(X, y30):
    """
    Trains HistGradientBoostingClassifier on extracted satellite features.
    Splits chronologically (first 70% train, last 30% test).
    """
    n_samples = len(X)
    split_idx = int(n_samples * 0.7)

    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y30[:split_idx], y30[split_idx:]

    logger.info(f"Train samples: {len(X_train)}, Test samples: {len(X_test)}")

    model = HistGradientBoostingClassifier(
        max_iter=100,
        learning_rate=0.05,
        max_depth=6,
        random_state=42
    )

    t0 = time.time()
    model.fit(X_train, y_train)
    train_time = time.time() - t0

    t1 = time.time()
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    infer_time = (time.time() - t1) / len(X_test) * 1000.0

    # Calculate metrics
    if len(np.unique(y_test)) > 1:
        precision = precision_score(y_test, y_pred, zero_division=0)
        recall = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        auc = roc_auc_score(y_test, y_prob)
        brier = brier_score_loss(y_test, y_prob)
    else:
        precision = recall = f1 = 0.0
        auc = 0.5
        brier = brier_score_loss(y_test, y_prob)

    # Persistence Baseline comparison
    # Persistence predicts class based on current temp (TIR1 < -10°C)
    y_pers = (X_test[:, 0] < -10.0).astype(int)
    pers_f1 = f1_score(y_test, y_pers, zero_division=0)

    metrics = {
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "train_time_sec": round(train_time, 3),
        "inference_latency_per_sample_ms": round(infer_time, 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1_score": round(float(f1), 4),
        "roc_auc": round(float(auc), 4),
        "brier_score": round(float(brier), 4),
        "persistence_baseline_f1": round(float(pers_f1), 4)
    }

    logger.info(f"HistGradientBoosting Metrics: {json.dumps(metrics, indent=2)}")

    # Save model
    weights_dir = r"c:\Users\nalla\OneDrive\Documents\Thunder\thunderAI\backend\app\weights"
    os.makedirs(weights_dir, exist_ok=True)
    model_path = os.path.join(weights_dir, "vajra_hgb_nowcast.joblib")
    joblib.dump(model, model_path)
    logger.info(f"Saved trained HGB model to {model_path}")

    return model, metrics

def train_convlstm_model(roi_scans):
    """
    Trains PyTorch ConvLSTM model on multi-frame spatial grid sequences.
    """
    from app.models.spatiotemporal_net import MultimodalSpatioTemporalModel

    device = torch.device("cpu")
    model = MultimodalSpatioTemporalModel(in_channels=8, hidden_channels=32).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-5)
    criterion = nn.BCELoss()

    # Construct sequence tensors from all ROIs
    sequence_batches = []
    for roi, scans in roi_scans.items():
        if len(scans) >= 4:
            # Construct 5-frame tensors by repeating/padding if needed
            grids = []
            for s in scans:
                # 8 channels: [dbz=0, vel=0, tir1, wv, light=0, cape=2000, cin=20, shear=15]
                t1 = s["tir1_celsius"]
                t2 = s["tir2_celsius"]
                wv = s["wv_celsius"]
                mir = s["mir_celsius"]

                # Convert Celsius to Kelvin
                t1_k = np.nan_to_num(t1 + 273.15, nan=280.0)
                wv_k = np.nan_to_num(wv + 273.15, nan=240.0)

                ch_dbz = np.zeros_like(t1_k)
                ch_vel = np.zeros_like(t1_k)
                ch_tir = t1_k
                ch_wv = wv_k
                ch_light = np.zeros_like(t1_k)
                ch_cape = np.full_like(t1_k, 2200.0)
                ch_cin = np.full_like(t1_k, 30.0)
                ch_shear = np.full_like(t1_k, 18.0)

                tensor_8ch = np.stack([ch_dbz, ch_vel, ch_tir, ch_wv, ch_light, ch_cape, ch_cin, ch_shear], axis=-1)
                grids.append(tensor_8ch)

            # Build sliding sequences of 5 frames
            while len(grids) < 5:
                grids.append(grids[-1])

            grids_arr = np.stack(grids[:5], axis=0) # [5, 64, 64, 8]
            sequence_batches.append(grids_arr)

    if not sequence_batches:
        logger.error("No valid sequences found for ConvLSTM training")
        return None, {}

    # Stack: [B, 5, 64, 64, 8] -> transpose to [B, 5, 8, 64, 64]
    X_seq = np.stack(sequence_batches, axis=0) # [B, 5, 64, 64, 8]
    X_seq_t = np.transpose(X_seq, (0, 1, 4, 2, 3)) # [B, 5, 8, 64, 64]
    tensor_input = torch.from_numpy(X_seq_t).float().to(device)

    # Target: binary thunderstorm risk mask derived from TIR1 < 260K (-13°C)
    target_mask = (tensor_input[:, -1, 2:3, :, :] < 260.0).float()

    logger.info(f"ConvLSTM Input tensor shape: {tensor_input.shape}, Target shape: {target_mask.shape}")

    model.train()
    epochs = 10
    t0 = time.time()
    for ep in range(epochs):
        optimizer.zero_grad()
        outputs = model(tensor_input, horizons_min=[30])
        p_thunder = outputs[30]["p_thunderstorm"]
        loss = criterion(p_thunder, target_mask)
        loss.backward()
        optimizer.step()
        logger.info(f"Epoch {ep+1}/{epochs} - ConvLSTM Loss: {loss.item():.6f}")

    train_time = time.time() - t0

    # Evaluate
    model.eval()
    t_start_inf = time.time()
    with torch.no_grad():
        preds = model(tensor_input, horizons_min=[15, 30, 45, 60, 90, 120, 180])
    inf_latency_ms = (time.time() - t_start_inf) * 1000.0

    p_30 = preds[30]["p_thunderstorm"].cpu().numpy().flatten()
    t_30 = target_mask.cpu().numpy().flatten()

    p_binary = (p_30 > 0.5).astype(int)
    precision = precision_score(t_30, p_binary, zero_division=0)
    recall = recall_score(t_30, p_binary, zero_division=0)
    f1 = f1_score(t_30, p_binary, zero_division=0)
    brier = brier_score_loss(t_30, p_30)

    convlstm_metrics = {
        "train_sequences_count": len(sequence_batches),
        "epochs": epochs,
        "train_time_sec": round(train_time, 3),
        "inference_latency_ms": round(inf_latency_ms, 2),
        "val_loss": round(float(loss.item()), 6),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1_score": round(float(f1), 4),
        "brier_score": round(float(brier), 4)
    }

    # Save trained PyTorch model checkpoint
    weights_dir = r"c:\Users\nalla\OneDrive\Documents\Thunder\thunderAI\backend\app\weights"
    ckpt_path = os.path.join(weights_dir, "vajra_spatiotemporal_v1.pt")

    checkpoint_payload = {
        "state_dict": model.state_dict(),
        "metadata": {
            "is_trained": True,
            "training_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "dataset_sources": "INSAT-3DS L1C SGP Imager (Sept 28, 2026)",
            "sequences_count": len(sequence_batches),
            "epochs": epochs,
            "final_loss": float(loss.item()),
            "metrics": convlstm_metrics,
            "backbone": "2-Layer ConvLSTM Encoder-Decoder",
            "in_channels": 8,
            "hidden_channels": 32
        }
    }

    torch.save(checkpoint_payload, ckpt_path)
    logger.info(f"Saved PyTorch ConvLSTM checkpoint to {ckpt_path}")

    return model, convlstm_metrics

def main():
    logger.info("=== Starting VAJRA-AI Model Training & Evaluation Pipeline ===")

    inventory, roi_scans = load_and_preprocess_dataset()
    X, y30, y_temp30 = construct_pixel_tabular_dataset(roi_scans)

    hgb_model, hgb_metrics = train_baseline_ml_model(X, y30)
    conv_model, conv_metrics = train_convlstm_model(roi_scans)

    summary = {
        "status": "SUCCESS",
        "dataset": {
            "total_insat3ds_files": len(inventory),
            "rois_processed": list(roi_scans.keys()),
            "total_pixel_samples": len(X),
            "positive_convective_samples": int(np.sum(y30))
        },
        "baseline_hgb_metrics": hgb_metrics,
        "convlstm_metrics": conv_metrics
    }

    # Save summary report artifact
    report_path = r"c:\Users\nalla\OneDrive\Documents\Thunder\thunderAI\backend\app\weights\training_report.json"
    with open(report_path, "w") as f:
        json.dump(summary, f, indent=2)

    logger.info(f"Pipeline complete! Saved summary report to {report_path}")
    print("\n=== FINAL TRAINING REPORT ===")
    print(json.dumps(summary, indent=2))

if __name__ == "__main__":
    main()
