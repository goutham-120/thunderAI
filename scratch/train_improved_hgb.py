import sys
import os
import joblib
import json
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score, precision_recall_curve, auc, brier_score_loss, confusion_matrix

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.services.insat_3ds_processor import insat_processor, ROI_BOUNDS

def compute_spatial_grad(arr):
    gy, gx = np.gradient(arr)
    return np.sqrt(gx**2 + gy**2)

def extract_features_and_targets(roi_name="NATIONAL", lead_min=30):
    scans = insat_processor.scan_inventory()
    print(f"Discovered {len(scans)} INSAT-3DS satellite scans.")

    scan_data = []
    timestamps = []

    for s in scans:
        try:
            feats = insat_processor.read_and_calibrate_scan(s["filepath"], roi_name=roi_name, target_grid_size=(64, 64))
            scan_data.append(feats)
            timestamps.append(s["timestamp_dt"])
        except Exception as e:
            print(f"Error reading {s['filename']}: {e}")

    num_scans = len(scan_data)
    X_list = []
    y_list = []
    metadata = []

    for i in range(1, num_scans):
        t0_dt = timestamps[i]
        target_idx = None
        for j in range(i + 1, num_scans):
            dt_min = (timestamps[j] - t0_dt).total_seconds() / 60.0
            if abs(dt_min - lead_min) < 10.0:
                target_idx = j
                break

        if target_idx is None:
            continue

        f0 = scan_data[i-1]
        f1 = scan_data[i]
        f_target = scan_data[target_idx]

        # Target: Severe convective cloud top (TIR1 < 235K / -38.15°C) at t0 + lead_min
        t1_target_k = f_target["tir1_celsius"] + 273.15
        target_mask = (t1_target_k < 235.0).astype(int)

        # 7 Features in Celsius
        t1_curr = f1["tir1_celsius"]
        t2_curr = f1["tir2_celsius"]
        wv_curr = f1["wv_celsius"]
        mir_curr = f1["mir_celsius"]
        split_curr = f1["split_window_diff"]
        grad_curr = compute_spatial_grad(t1_curr)
        prev_cool = f0["tir1_celsius"] - f1["tir1_celsius"]

        X_frame = np.column_stack([
            t1_curr.flatten(),
            t2_curr.flatten(),
            wv_curr.flatten(),
            mir_curr.flatten(),
            split_curr.flatten(),
            grad_curr.flatten(),
            prev_cool.flatten()
        ])

        y_frame = target_mask.flatten()

        X_list.append(X_frame)
        y_list.append(y_frame)
        metadata.append({
            "t0_file": scans[i]["filename"],
            "t0_iso": timestamps[i].isoformat(),
            "target_file": scans[target_idx]["filename"],
            "target_iso": timestamps[target_idx].isoformat(),
            "dt_minutes": (timestamps[target_idx] - timestamps[i]).total_seconds() / 60.0
        })

    return X_list, y_list, metadata

def evaluate_metrics(y_true, y_prob, threshold=0.5):
    y_true = np.asarray(y_true, dtype=int).flatten()
    y_prob = np.asarray(y_prob, dtype=float).flatten()

    total = len(y_true)
    positives = int(np.sum(y_true))
    prevalence = float(positives / total) if total > 0 else 0.0

    if positives == 0 or positives == total:
        roc_auc = "N/A"
        pr_auc = "N/A"
    else:
        roc_auc = round(float(roc_auc_score(y_true, y_prob)), 4)
        prec_arr, rec_arr, _ = precision_recall_curve(y_true, y_prob)
        pr_auc = round(float(auc(rec_arr, prec_arr)), 4)

    brier = round(float(brier_score_loss(y_true, y_prob)), 4)

    y_pred = (y_prob >= threshold).astype(int)
    tn, fp, fn, tp = [int(v) for v in confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()]

    pod = round(float(tp / (tp + fn)), 4) if (tp + fn) > 0 else 0.0
    far = round(float(fp / (tp + fp)), 4) if (tp + fp) > 0 else 0.0
    prec = round(float(tp / (tp + fp)), 4) if (tp + fp) > 0 else 0.0
    csi = round(float(tp / (tp + fp + fn)), 4) if (tp + fp + fn) > 0 else 0.0
    f1 = round(float(2 * tp / (2 * tp + fp + fn)), 4) if (2 * tp + fp + fn) > 0 else 0.0

    return {
        "total": total, "positives": positives, "prevalence": round(prevalence, 4),
        "threshold": threshold, "CM": {"TN": tn, "FP": fp, "FN": fn, "TP": tp},
        "precision": prec, "recall_pod": pod, "far": far, "csi": csi, "f1": f1,
        "roc_auc": roc_auc, "pr_auc": pr_auc, "brier": brier
    }

def main():
    print("=" * 80)
    print("VAJRA-AI: TRAINING & EVALUATING IMPROVED HGB NOWCAST MODEL")
    print("=" * 80)

    X_frames, y_frames, meta = extract_features_and_targets(lead_min=30)
    print(f"Extracted {len(X_frames)} matched sequence frames for +30m forecast.")

    # Chronological Split: First 3 frames for Training/Tuning, remaining 3 frames for Held-Out Evaluation
    train_frames = len(X_frames) // 2
    X_train = np.vstack(X_frames[:train_frames])
    y_train = np.concatenate(y_frames[:train_frames])

    X_test = np.vstack(X_frames[train_frames:])
    y_test = np.concatenate(y_frames[train_frames:])

    print(f"Training samples: {len(X_train)} (Positives: {np.sum(y_train)} / {len(y_train)}, {np.mean(y_train)*100:.2f}%)")
    print(f"Held-out test samples: {len(X_test)} (Positives: {np.sum(y_test)} / {len(y_test)}, {np.mean(y_test)*100:.2f}%)")

    # 1. Train Class-Balanced HistGradientBoostingClassifier
    print("\nTraining Class-Weighted HistGradientBoostingClassifier (max_iter=150, class_weight='balanced')...")
    hgb_v2 = HistGradientBoostingClassifier(
        max_iter=150,
        learning_rate=0.03,
        max_depth=5,
        min_samples_leaf=20,
        class_weight='balanced',
        random_state=42
    )
    hgb_v2.fit(X_train, y_train)

    # 2. Evaluate on Training set to tune operating threshold for CSI
    train_probs = hgb_v2.predict_proba(X_train)[:, 1]
    best_thresh = 0.5
    best_csi = -1.0
    for th in np.arange(0.1, 0.95, 0.05):
        m = evaluate_metrics(y_train, train_probs, threshold=th)
        if m["csi"] > best_csi:
            best_csi = m["csi"]
            best_thresh = round(float(th), 2)

    print(f"Optimal Decision Threshold selected on Training Set: {best_thresh} (Train CSI: {best_csi:.4f})")

    # 3. Evaluate on Held-Out Test Set
    test_probs = hgb_v2.predict_proba(X_test)[:, 1]

    hgb_v2_metrics = evaluate_metrics(y_test, test_probs, threshold=best_thresh)

    print("\n" + "=" * 70)
    print("HELD-OUT TEST SET RESULTS (+30m):")
    print("=" * 70)
    print(f"  Samples: {hgb_v2_metrics['total']} | Positives: {hgb_v2_metrics['positives']} ({hgb_v2_metrics['prevalence']*100:.2f}%)")
    print(f"  Confusion Matrix: TN={hgb_v2_metrics['CM']['TN']}, FP={hgb_v2_metrics['CM']['FP']}, FN={hgb_v2_metrics['CM']['FN']}, TP={hgb_v2_metrics['CM']['TP']}")
    print(f"  POD / Recall: {hgb_v2_metrics['recall_pod']}")
    print(f"  Precision:    {hgb_v2_metrics['precision']}")
    print(f"  FAR:          {hgb_v2_metrics['far']}")
    print(f"  CSI Score:    {hgb_v2_metrics['csi']}")
    print(f"  F1 Score:     {hgb_v2_metrics['f1']}")
    print(f"  ROC-AUC:      {hgb_v2_metrics['roc_auc']}")
    print(f"  PR-AUC:       {hgb_v2_metrics['pr_auc']}")
    print(f"  Brier Score:  {hgb_v2_metrics['brier']}")

    # Save Improved Model Artifact
    weights_dir = os.path.join(os.path.dirname(__file__), "..", "backend", "app", "weights")
    v2_path = os.path.join(weights_dir, "vajra_hgb_nowcast_v2.joblib")
    joblib.dump(hgb_v2, v2_path)
    print(f"\nSaved improved model artifact to {v2_path}")

    # Also safely update vajra_hgb_nowcast.joblib while keeping a backup
    backup_path = os.path.join(weights_dir, "vajra_hgb_nowcast_v1_backup.joblib")
    if not os.path.exists(backup_path):
        orig_path = os.path.join(weights_dir, "vajra_hgb_nowcast.joblib")
        if os.path.exists(orig_path):
            import shutil
            shutil.copy(orig_path, backup_path)
            print(f"Backed up original HGB model to {backup_path}")
            shutil.copy(v2_path, orig_path)
            print(f"Updated vajra_hgb_nowcast.joblib with improved class-balanced model.")

if __name__ == "__main__":
    main()
