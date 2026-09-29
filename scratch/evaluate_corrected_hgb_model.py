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

def compute_spatial_grad(arr):
    gy, gx = np.gradient(arr)
    return np.sqrt(gx**2 + gy**2)

def evaluate_metrics(y_true, y_prob, threshold=0.35):
    """
    Computes confusion matrix, POD, Precision, FAR, CSI, F1, ROC-AUC, PR-AUC, Brier score.
    """
    y_true = np.asarray(y_true, dtype=int).flatten()
    y_prob = np.asarray(y_prob, dtype=float).flatten()

    total_samples = len(y_true)
    positives = int(np.sum(y_true))
    prevalence = float(positives / total_samples) if total_samples > 0 else 0.0

    prob_min = float(np.min(y_prob)) if total_samples > 0 else 0.0
    prob_max = float(np.max(y_prob)) if total_samples > 0 else 0.0
    prob_mean = float(np.mean(y_prob)) if total_samples > 0 else 0.0
    prob_std = float(np.std(y_prob)) if total_samples > 0 else 0.0
    prob_quantiles = [float(q) for q in np.quantile(y_prob, [0.10, 0.50, 0.90, 0.99])] if total_samples > 0 else [0,0,0,0]

    if positives == 0 or positives == total_samples:
        roc_auc = "N/A (single class)"
        pr_auc = "N/A (single class)"
    else:
        try:
            roc_auc = round(float(roc_auc_score(y_true, y_prob)), 4)
        except Exception:
            roc_auc = "N/A"

        try:
            prec_arr, rec_arr, _ = precision_recall_curve(y_true, y_prob)
            pr_auc = round(float(auc(rec_arr, prec_arr)), 4)
        except Exception:
            pr_auc = "N/A"

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
            "p10_p50_p90_p99": [round(q, 6) for q in prob_quantiles]
        }
    }

def main():
    print("=" * 80)
    print("VAJRA-AI: CORRECTED FORECAST EVALUATION BENCHMARK")
    print("=" * 80)

    hgb_path = os.path.join(os.path.dirname(__file__), "..", "backend", "app", "weights", "vajra_hgb_nowcast.joblib")
    hgb_model = joblib.load(hgb_path)

    roi_name = "NATIONAL"
    scans = insat_processor.scan_inventory()
    print(f"Processing {len(scans)} INSAT-3DS satellite HDF5 scans for ROI '{roi_name}'...")

    scan_calibrated = []
    timestamps = []

    for s in scans:
        try:
            feats = insat_processor.read_and_calibrate_scan(s["filepath"], roi_name=roi_name, target_grid_size=(64, 64))
            scan_calibrated.append(feats)
            timestamps.append(s["timestamp_dt"])
        except Exception as e:
            print(f"Error reading {s['filename']}: {e}")

    num_scans = len(scan_calibrated)
    horizons = [30, 60, 90]
    eval_results = {}

    for h in horizons:
        print(f"\n" + "-" * 60)
        print(f"EVALUATION FOR FORECAST HORIZON: +{h} MINUTES")
        print("-" * 60)

        y_true_all = []
        y_prob_pers_all = []
        y_prob_hgb_all = []

        valid_pairs_count = 0

        for i in range(1, num_scans):
            t0_dt = timestamps[i]
            target_idx = None
            for j in range(i + 1, num_scans):
                dt_min = (timestamps[j] - t0_dt).total_seconds() / 60.0
                if abs(dt_min - h) < 10.0:
                    target_idx = j
                    break

            if target_idx is None:
                continue

            valid_pairs_count += 1
            f0 = scan_calibrated[i-1]
            f1 = scan_calibrated[i]
            f_target = scan_calibrated[target_idx]

            # Severe convective proxy target: TIR1 < 235K (-38.15°C)
            t1_target_k = f_target["tir1_celsius"] + 273.15
            target_label = (t1_target_k < 235.0).astype(int)

            # Persistence prediction: current convective state at t0
            t1_curr_k = f1["tir1_celsius"] + 273.15
            pers_label = (t1_curr_k < 235.0).astype(int)

            # HGB prediction using exact 7 features in Celsius
            t1_curr = f1["tir1_celsius"]
            t2_curr = f1["tir2_celsius"]
            wv_curr = f1["wv_celsius"]
            mir_curr = f1["mir_celsius"]
            split_curr = f1["split_window_diff"]
            grad_curr = compute_spatial_grad(t1_curr)
            prev_cool = f0["tir1_celsius"] - f1["tir1_celsius"]

            X_7feats = np.column_stack([
                t1_curr.flatten(),
                t2_curr.flatten(),
                wv_curr.flatten(),
                mir_curr.flatten(),
                split_curr.flatten(),
                grad_curr.flatten(),
                prev_cool.flatten()
            ])

            prob_hgb = hgb_model.predict_proba(X_7feats)[:, 1].reshape((64, 64))

            y_true_all.extend(target_label.flatten())
            y_prob_pers_all.extend(pers_label.flatten())
            y_prob_hgb_all.extend(prob_hgb.flatten())

        print(f"  Valid forecast-target pairs evaluated: {valid_pairs_count} pairs ({len(y_true_all)} pixels)")

        pers_m = evaluate_metrics(y_true_all, y_prob_pers_all, threshold=0.5)
        hgb_def_m = evaluate_metrics(y_true_all, y_prob_hgb_all, threshold=0.35)
        hgb_cal_m = evaluate_metrics(y_true_all, y_prob_hgb_all, threshold=0.20)

        print(f"\n  1. [PERSISTENCE BASELINE (+{h}m)]")
        print(f"     Samples: {pers_m['total_samples']} | Positives: {pers_m['positives']} (Prevalence: {pers_m['prevalence']})")
        print(f"     Matrix: TN={pers_m['confusion_matrix']['TN']}, FP={pers_m['confusion_matrix']['FP']}, FN={pers_m['confusion_matrix']['FN']}, TP={pers_m['confusion_matrix']['TP']}")
        print(f"     POD/Recall: {pers_m['recall_pod']} | Precision: {pers_m['precision']} | FAR: {pers_m['far']} | CSI: {pers_m['csi']} | F1: {pers_m['f1']}")
        print(f"     ROC-AUC: {pers_m['roc_auc']} | PR-AUC: {pers_m['pr_auc']} | Brier: {pers_m['brier_score']}")

        print(f"\n  2. [CORRECTED HISTGRADIENTBOOSTING MODEL (Threshold=0.35, +{h}m)]")
        print(f"     Matrix: TN={hgb_def_m['confusion_matrix']['TN']}, FP={hgb_def_m['confusion_matrix']['FP']}, FN={hgb_def_m['confusion_matrix']['FN']}, TP={hgb_def_m['confusion_matrix']['TP']}")
        print(f"     POD/Recall: {hgb_def_m['recall_pod']} | Precision: {hgb_def_m['precision']} | FAR: {hgb_def_m['far']} | CSI: {hgb_def_m['csi']} | F1: {hgb_def_m['f1']}")
        print(f"     ROC-AUC: {hgb_def_m['roc_auc']} | PR-AUC: {hgb_def_m['pr_auc']} | Brier: {hgb_def_m['brier_score']}")
        print(f"     Prob Stats: Min={hgb_def_m['prob_stats']['min']}, Max={hgb_def_m['prob_stats']['max']}, Mean={hgb_def_m['prob_stats']['mean']}, P90={hgb_def_m['prob_stats']['p10_p50_p90_p99'][2]}")

        print(f"\n  3. [CORRECTED HISTGRADIENTBOOSTING MODEL (Calibrated Threshold=0.20, +{h}m)]")
        print(f"     Matrix: TN={hgb_cal_m['confusion_matrix']['TN']}, FP={hgb_cal_m['confusion_matrix']['FP']}, FN={hgb_cal_m['confusion_matrix']['FN']}, TP={hgb_cal_m['confusion_matrix']['TP']}")
        print(f"     POD/Recall: {hgb_cal_m['recall_pod']} | Precision: {hgb_cal_m['precision']} | FAR: {hgb_cal_m['far']} | CSI: {hgb_cal_m['csi']} | F1: {hgb_cal_m['f1']}")

        eval_results[f"horizon_{h}min"] = {
            "pairs_count": valid_pairs_count,
            "samples_evaluated": len(y_true_all),
            "persistence": pers_m,
            "hgb_corrected_default_0.35": hgb_def_m,
            "hgb_corrected_calibrated_0.20": hgb_cal_m
        }

    # Update backend reports with corrected reproducible metrics
    reports_dir = os.path.join(os.path.dirname(__file__), "..", "backend", "reports")
    json_path = os.path.join(reports_dir, "validation_metrics.json")
    with open(json_path, "w") as f:
        json.dump(eval_results, f, indent=2)

    print(f"\nSaved updated metrics JSON to {json_path}")

if __name__ == "__main__":
    main()
