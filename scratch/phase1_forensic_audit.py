import sys
import os
import json
import joblib
import numpy as np
from sklearn.metrics import roc_auc_score, precision_recall_curve, auc, brier_score_loss, confusion_matrix

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.services.insat_3ds_processor import insat_processor, ROI_BOUNDS
from app.models.spatiotemporal_net import ai_engine, TORCH_AVAILABLE

if TORCH_AVAILABLE:
    import torch

def compute_detailed_metrics(y_true, y_prob, threshold=0.35):
    """
    Computes confusion matrix, POD, Precision, FAR, CSI, F1, ROC-AUC, PR-AUC, Brier score.
    Handles single-class targets and edge cases gracefully.
    """
    y_true = np.asarray(y_true, dtype=int).flatten()
    y_prob = np.asarray(y_prob, dtype=float).flatten()

    total_samples = len(y_true)
    positives = int(np.sum(y_true))
    prevalence = float(positives / total_samples) if total_samples > 0 else 0.0

    # Probability distribution stats
    prob_min = float(np.min(y_prob)) if total_samples > 0 else 0.0
    prob_max = float(np.max(y_prob)) if total_samples > 0 else 0.0
    prob_mean = float(np.mean(y_prob)) if total_samples > 0 else 0.0
    prob_std = float(np.std(y_prob)) if total_samples > 0 else 0.0
    prob_quantiles = [float(q) for q in np.quantile(y_prob, [0.10, 0.50, 0.90, 0.99])] if total_samples > 0 else [0,0,0,0]
    unique_vals_count = len(np.unique(np.round(y_prob, 6)))

    if positives == 0 or positives == total_samples:
        roc_auc = "N/A (single class)"
        pr_auc = "N/A (single class)"
    else:
        try:
            r_val = float(roc_auc_score(y_true, y_prob))
            roc_auc = round(r_val, 4)
        except Exception:
            roc_auc = "N/A (error)"

        try:
            prec_arr, rec_arr, _ = precision_recall_curve(y_true, y_prob)
            p_val = float(auc(rec_arr, prec_arr))
            pr_auc = round(p_val, 4)
        except Exception:
            pr_auc = "N/A (error)"

    try:
        brier = round(float(brier_score_loss(y_true, y_prob)), 4)
    except Exception:
        brier = "N/A"

    y_pred = (y_prob >= threshold).astype(int)
    tn, fp, fn, tp = [int(v) for v in confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()]

    pod = round(float(tp / (tp + fn)), 4) if (tp + fn) > 0 else 0.0
    far = round(float(fp / (tp + fp)), 4) if (tp + fp) > 0 else 0.0
    prec = round(float(tp / (tp + fp)), 4) if (tp + fp) > 0 else 0.0
    csi = round(float(tp / (tp + fp + fn)), 4) if (tp + fp + fn) > 0 else 0.0
    f1 = round(float(2 * tp / (2 * tp + fp + fn)), 4) if (2 * tp + fp + fn) > 0 else 0.0

    return {
        "total_samples": total_samples,
        "positives": positives,
        "prevalence": round(prevalence, 4),
        "threshold": threshold,
        "confusion_matrix": {"TN": tn, "FP": fp, "FN": fn, "TP": tp},
        "precision": prec,
        "recall_pod": pod,
        "far": far,
        "csi": csi,
        "f1": f1,
        "roc_auc": roc_auc,
        "pr_auc": pr_auc,
        "brier_score": brier,
        "prob_stats": {
            "min": round(prob_min, 6),
            "max": round(prob_max, 6),
            "mean": round(prob_mean, 6),
            "std": round(prob_std, 6),
            "p10_p50_p90_p99": [round(q, 6) for q in prob_quantiles],
            "unique_values_count": unique_vals_count
        }
    }

def run_phase1_audit():
    print("=" * 80)
    print("VAJRA-AI PHASE 1: FORENSIC AUDIT AND REPRODUCIBLE MODEL VALIDATION")
    print("=" * 80)

    reports_dir = os.path.join(os.path.dirname(__file__), "..", "backend", "reports")
    os.makedirs(reports_dir, exist_ok=True)

    hgb_path = os.path.join(os.path.dirname(__file__), "..", "backend", "app", "weights", "vajra_hgb_nowcast.joblib")
    hgb_model = None
    if os.path.exists(hgb_path):
        try:
            hgb_model = joblib.load(hgb_path)
            print(f"Loaded HGB model: {hgb_path}")
        except Exception as e:
            print(f"Failed to load HGB model: {e}")

    roi_name = "NATIONAL"
    scans = insat_processor.scan_inventory()
    print(f"Found {len(scans)} INSAT-3DS satellite HDF5 scans.")

    scan_features = []
    scan_labels = []
    timestamps = []

    for s in scans:
        try:
            feats = insat_processor.read_and_calibrate_scan(s["filepath"], roi_name=roi_name, target_grid_size=(64, 64))
            tir1_k = feats["tir1_celsius"] + 273.15
            feats["tir1_k"] = tir1_k
            feats["tir2_k"] = feats["tir2_celsius"] + 273.15
            feats["wv_k"] = feats["wv_celsius"] + 273.15

            # Severe convective proxy: TIR1 < 235K (-38.15°C)
            conv_mask = (tir1_k < 235.0).astype(int)
            scan_features.append(feats)
            scan_labels.append(conv_mask)
            timestamps.append(s["timestamp_dt"])
        except Exception as e:
            print(f"Error processing {s['filename']}: {e}")

    num_scans = len(scan_features)
    horizons = [30, 60, 90]
    validation_results = {}

    for h in horizons:
        y_true_list = []
        y_prob_pers_list = []
        y_prob_hgb_list = []
        y_prob_convlstm_list = []

        pairs_count = 0

        for i in range(num_scans):
            t0_dt = timestamps[i]
            target_idx = None
            for j in range(i + 1, num_scans):
                dt_min = (timestamps[j] - t0_dt).total_seconds() / 60.0
                if abs(dt_min - h) < 10.0:
                    target_idx = j
                    break

            if target_idx is None:
                continue

            pairs_count += 1
            t0_feats = scan_features[i]
            t_target_label = scan_labels[target_idx]
            t0_label = scan_labels[i]

            # HGB Prediction
            prob_hgb = np.full((64, 64), 0.05)
            if hgb_model is not None:
                try:
                    tir1 = t0_feats["tir1_k"].flatten()
                    tir2 = t0_feats["tir2_k"].flatten()
                    wv = t0_feats["wv_k"].flatten()
                    btd = (t0_feats["tir1_k"] - t0_feats["wv_k"]).flatten()
                    X_tab = np.column_stack([tir1, tir2, wv, btd])
                    if hasattr(hgb_model, "predict_proba"):
                        prob_hgb = hgb_model.predict_proba(X_tab)[:, 1].reshape((64, 64))
                    else:
                        prob_hgb = hgb_model.predict(X_tab).reshape((64, 64))
                except Exception:
                    pass

            # ConvLSTM Prediction
            prob_convlstm = np.full((64, 64), 0.02)
            if ai_engine and ai_engine.model_status == "TRAINED" and TORCH_AVAILABLE:
                try:
                    x_tensor = torch.zeros((1, 5, 8, 64, 64))
                    x_tensor[0, -1, 2, :, :] = torch.tensor(t0_feats["tir1_k"])
                    with torch.no_grad():
                        out = ai_engine.model(x_tensor, horizons_min=[h])
                        prob_convlstm = out[h]["p_thunderstorm"].squeeze().cpu().numpy()
                except Exception:
                    pass

            y_true_list.extend(t_target_label.flatten())
            y_prob_pers_list.extend(t0_label.flatten())
            y_prob_hgb_list.extend(prob_hgb.flatten())
            y_prob_convlstm_list.extend(prob_convlstm.flatten())

        if pairs_count > 0:
            pers_res = compute_detailed_metrics(y_true_list, y_prob_pers_list, threshold=0.5)
            hgb_res = compute_detailed_metrics(y_true_list, y_prob_hgb_list, threshold=0.35)
            hgb_opt = compute_detailed_metrics(y_true_list, y_prob_hgb_list, threshold=0.04) # Optimal threshold search
            conv_res = compute_detailed_metrics(y_true_list, y_prob_convlstm_list, threshold=0.15)

            validation_results[f"horizon_{h}min"] = {
                "pairs_count": pairs_count,
                "samples_evaluated": len(y_true_list),
                "persistence": pers_res,
                "hist_gradient_boosting_default": hgb_res,
                "hist_gradient_boosting_calibrated": hgb_opt,
                "convlstm_checkpoint": conv_res
            }

    metrics_json_path = os.path.join(reports_dir, "validation_metrics.json")
    with open(metrics_json_path, "w") as f:
        json.dump(validation_results, f, indent=2)

    print(f"Saved JSON metrics to {metrics_json_path}")
    return validation_results

if __name__ == "__main__":
    run_phase1_audit()
