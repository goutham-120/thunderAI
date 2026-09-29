import sys
import os
import json
import joblib
import numpy as np
from sklearn.metrics import roc_auc_score, precision_recall_curve, auc, brier_score_loss, confusion_matrix

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.services.insat_3ds_processor import insat_processor, ROI_BOUNDS

def compute_spatial_grad(arr):
    gy, gx = np.gradient(arr)
    return np.sqrt(gx**2 + gy**2)

def evaluate_metrics(y_true, y_prob, threshold=0.35):
    """
    Computes exact confusion matrix, POD, Precision, FAR, CSI, F1, ROC-AUC, PR-AUC, Brier score.
    Asserts TN + FP + FN + TP == len(y_true).
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

    # Mathematical sanity check
    assert tn + fp + fn + tp == total_samples, f"Confusion matrix sum ({tn+fp+fn+tp}) does not equal total samples ({total_samples})"

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

def run_skill_audit():
    print("=" * 80)
    print("VAJRA-AI: METRIC CONSISTENCY, THRESHOLD SWEEP & FORECAST SKILL AUDIT")
    print("=" * 80)

    hgb_path = os.path.join(os.path.dirname(__file__), "..", "backend", "app", "weights", "vajra_hgb_nowcast.joblib")
    hgb_model = joblib.load(hgb_path)

    roi_name = "NATIONAL"
    scans = insat_processor.scan_inventory()
    print(f"\n1. DATASET INDEPENDENCE AUDIT:")
    print(f"  - Total satellite HDF5 scans: {len(scans)}")
    print(f"  - Number of independent observation dates: 1 (28-SEP-2026)")
    print(f"  - Total observation time span: 5.5 hours (18:00 UTC to 23:30 UTC)")
    print(f"  - Independent meteorological event count: 1 (Single mesoscale convective system)")
    print(f"  - WARNING: Evaluating millions of spatial pixels from 1 date does NOT constitute millions of independent weather events. Out-of-date generalization cannot be established.")

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
    audit_results = {}

    for h in horizons:
        print(f"\n" + "-" * 70)
        print(f"EVALUATION FOR FORECAST HORIZON: +{h} MINUTES")
        print("-" * 70)

        pairs = []

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

            f0 = scan_calibrated[i-1]
            f1 = scan_calibrated[i]
            f_target = scan_calibrated[target_idx]

            # Genuinely future observation target: TIR1 < 235K at t0 + h min
            t1_target_k = f_target["tir1_celsius"] + 273.15
            target_label = (t1_target_k < 235.0).astype(int)

            # Persistence prediction: current convective state at t0
            t1_curr_k = f1["tir1_celsius"] + 273.15
            pers_label = (t1_curr_k < 235.0).astype(int)

            # Extract exact 7 trained features in Celsius from t0 and t0-1 only (no future leakage)
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

            pairs.append({
                "origin_file": scans[i]["filename"],
                "origin_time": timestamps[i].isoformat(),
                "target_file": scans[target_idx]["filename"],
                "target_time": timestamps[target_idx].isoformat(),
                "dt_minutes": (timestamps[target_idx] - timestamps[i]).total_seconds() / 60.0,
                "target_label": target_label,
                "pers_label": pers_label,
                "prob_hgb": prob_hgb
            })

        print(f"  Valid target-matched pairs: {len(pairs)} pairs")

        if len(pairs) == 0:
            continue

        # Split sequence chronologically for leakage-free threshold tuning
        # Tuning set: first 50% of pairs; Held-out evaluation set: remaining 50% of pairs
        split_idx = max(1, len(pairs) // 2)
        tuning_pairs = pairs[:split_idx]
        heldout_pairs = pairs[split_idx:]

        print(f"  Chronological Split: Tuning pairs={len(tuning_pairs)}, Held-out evaluation pairs={len(heldout_pairs)}")

        # Accumulate pixels for held-out evaluation
        y_true_eval = []
        y_pers_eval = []
        y_hgb_eval = []

        for p in heldout_pairs:
            y_true_eval.extend(p["target_label"].flatten())
            y_pers_eval.extend(p["pers_label"].flatten())
            y_hgb_eval.extend(p["prob_hgb"].flatten())

        y_true_eval = np.array(y_true_eval)
        y_pers_eval = np.array(y_pers_eval)
        y_hgb_eval = np.array(y_hgb_eval)

        # 1. Persistence Baseline
        pers_res = evaluate_metrics(y_true_eval, y_pers_eval, threshold=0.5)
        print(f"\n  [PERSISTENCE BASELINE (Held-out Set, +{h}m)]")
        print(f"     Samples: {pers_res['total_samples']} | Positives: {pers_res['positives']} (Prevalence: {pers_res['prevalence']})")
        print(f"     Matrix: TN={pers_res['confusion_matrix']['TN']}, FP={pers_res['confusion_matrix']['FP']}, FN={pers_res['confusion_matrix']['FN']}, TP={pers_res['confusion_res'] if 'confusion_res' in pers_res else pers_res['confusion_matrix']['TP']}")
        print(f"     POD/Recall: {pers_res['recall_pod']} | Precision: {pers_res['precision']} | FAR: {pers_res['far']} | CSI: {pers_res['csi']} | F1: {pers_res['f1']}")
        print(f"     ROC-AUC: {pers_res['roc_auc']} | PR-AUC: {pers_res['pr_auc']} | Brier: {pers_res['brier_score']}")

        # 2. HGB Threshold Sweep on Tuning Set
        y_true_tune = []
        y_hgb_tune = []
        for p in tuning_pairs:
            y_true_tune.extend(p["target_label"].flatten())
            y_hgb_tune.extend(p["prob_hgb"].flatten())
        y_true_tune = np.array(y_true_tune)
        y_hgb_tune = np.array(y_hgb_tune)

        sweep_thresholds = [0.05, 0.10, 0.20, 0.35, 0.50, 0.70, 0.85]
        best_csi = -1.0
        best_thresh = 0.50

        print(f"\n  [HGB THRESHOLD SWEEP (Tuning Set, +{h}m)]")
        sweep_table = []
        for th in sweep_thresholds:
            t_m = evaluate_metrics(y_true_tune, y_hgb_tune, threshold=th)
            print(f"     Thresh={th:0.2f} -> POD={t_m['recall_pod']:0.4f}, Prec={t_m['precision']:0.4f}, FAR={t_m['far']:0.4f}, CSI={t_m['csi']:0.4f}")
            sweep_table.append(t_m)
            if t_m["csi"] > best_csi:
                best_csi = t_m["csi"]
                best_thresh = th

        print(f"  Selected Optimal Threshold on Tuning Set: {best_thresh:0.2f} (Tuning CSI = {best_csi:0.4f})")

        # 3. Evaluate HGB on Held-out Set at Default (0.35) and Selected Optimal Threshold
        hgb_default_res = evaluate_metrics(y_true_eval, y_hgb_eval, threshold=0.35)
        hgb_optimal_res = evaluate_metrics(y_true_eval, y_hgb_eval, threshold=best_thresh)

        print(f"\n  [HGB MODEL (Held-out Set, Default Threshold=0.35, +{h}m)]")
        print(f"     Matrix: TN={hgb_default_res['confusion_matrix']['TN']}, FP={hgb_default_res['confusion_matrix']['FP']}, FN={hgb_default_res['confusion_matrix']['FN']}, TP={hgb_default_res['confusion_matrix']['TP']}")
        print(f"     POD/Recall: {hgb_default_res['recall_pod']} | Precision: {hgb_default_res['precision']} | FAR: {hgb_default_res['far']} | CSI: {hgb_default_res['csi']} | F1: {hgb_default_res['f1']}")
        print(f"     ROC-AUC: {hgb_default_res['roc_auc']} | PR-AUC: {hgb_default_res['pr_auc']} | Brier: {hgb_default_res['brier_score']}")

        print(f"\n  [HGB MODEL (Held-out Set, Optimal Threshold={best_thresh:0.2f}, +{h}m)]")
        print(f"     Matrix: TN={hgb_optimal_res['confusion_matrix']['TN']}, FP={hgb_optimal_res['confusion_matrix']['FP']}, FN={hgb_optimal_res['confusion_matrix']['FN']}, TP={hgb_optimal_res['confusion_matrix']['TP']}")
        print(f"     POD/Recall: {hgb_optimal_res['recall_pod']} | Precision: {hgb_optimal_res['precision']} | FAR: {hgb_optimal_res['far']} | CSI: {hgb_optimal_res['csi']} | F1: {hgb_optimal_res['f1']}")

        audit_results[f"horizon_{h}min"] = {
            "target_horizon_minutes": h,
            "total_observation_pairs": len(pairs),
            "tuning_pairs_count": len(tuning_pairs),
            "heldout_eval_pairs_count": len(heldout_pairs),
            "heldout_samples_evaluated": len(y_true_eval),
            "persistence_baseline": pers_res,
            "hgb_default_threshold_0.35": hgb_default_res,
            "hgb_tuning_selected_threshold": {
                "selected_threshold": best_thresh,
                "metrics_on_heldout": hgb_optimal_res
            },
            "threshold_sweep_tuning_set": sweep_table
        }

    reports_dir = os.path.join(os.path.dirname(__file__), "..", "backend", "reports")
    json_path = os.path.join(reports_dir, "validation_metrics.json")
    with open(json_path, "w") as f:
        json.dump(audit_results, f, indent=2)

    print(f"\nSaved verified audit metrics to {json_path}")
    return audit_results

if __name__ == "__main__":
    run_skill_audit()
