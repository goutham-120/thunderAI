import sys
import os
import joblib
import numpy as np
from sklearn.metrics import roc_auc_score, precision_recall_curve, auc, brier_score_loss, confusion_matrix

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.services.insat_3ds_processor import insat_processor, ROI_BOUNDS
from app.models.spatiotemporal_net import ai_engine, TORCH_AVAILABLE

if TORCH_AVAILABLE:
    import torch

def evaluate_metrics(y_true, y_prob, threshold=0.35):
    """
    Computes scientific verification metrics: Confusion Matrix, POD/Recall, Precision, FAR, CSI, F1, ROC-AUC, PR-AUC, Brier Score.
    """
    y_true = np.asarray(y_true, dtype=int).flatten()
    y_prob = np.asarray(y_prob, dtype=float).flatten()

    total_samples = len(y_true)
    positives = int(np.sum(y_true))
    prevalence = float(positives / total_samples) if total_samples > 0 else 0.0

    if positives == 0 or positives == total_samples:
        roc_auc = np.nan
        pr_auc = np.nan
    else:
        try:
            roc_auc = float(roc_auc_score(y_true, y_prob))
        except Exception:
            roc_auc = np.nan

        try:
            prec_arr, rec_arr, _ = precision_recall_curve(y_true, y_prob)
            pr_auc = float(auc(rec_arr, prec_arr))
        except Exception:
            pr_auc = np.nan

    try:
        brier = float(brier_score_loss(y_true, y_prob))
    except Exception:
        brier = np.nan

    y_pred = (y_prob >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()

    pod = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0 # Recall
    far = float(fp / (tp + fp)) if (tp + fp) > 0 else 0.0 # False Alarm Ratio
    prec = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
    csi = float(tp / (tp + fp + fn)) if (tp + fp + fn) > 0 else 0.0 # Critical Success Index
    f1 = float(2 * tp / (2 * tp + fp + fn)) if (2 * tp + fp + fn) > 0 else 0.0

    return {
        "total_samples": total_samples,
        "positives": positives,
        "prevalence": round(prevalence, 4),
        "confusion_matrix": {"TN": int(tn), "FP": int(fp), "FN": int(fn), "TP": int(tp)},
        "threshold": threshold,
        "precision": round(prec, 4),
        "recall_pod": round(pod, 4),
        "far": round(far, 4),
        "csi": round(csi, 4),
        "f1": round(f1, 4),
        "roc_auc": round(roc_auc, 4) if not np.isnan(roc_auc) else "N/A (single class)",
        "pr_auc": round(pr_auc, 4) if not np.isnan(pr_auc) else "N/A (single class)",
        "brier_score": round(brier, 4) if not np.isnan(brier) else "N/A"
    }

def main():
    print("=" * 80)
    print("VAJRA-AI: FORECAST VALIDATION & BASELINE BENCHMARKING AUDIT")
    print("=" * 80)

    hgb_path = os.path.join(os.path.dirname(__file__), "..", "backend", "app", "weights", "vajra_hgb_nowcast.joblib")
    hgb_model = None
    if os.path.exists(hgb_path):
        try:
            hgb_model = joblib.load(hgb_path)
            print(f"Loaded saved HistGradientBoosting model from {hgb_path}")
        except Exception as e:
            print(f"Failed to load HGB model: {e}")

    roi_name = "NATIONAL"

    scans = insat_processor.scan_inventory()
    print(f"\nProcessing {len(scans)} INSAT-3DS scans for ROI '{roi_name}'...")

    scan_features = []
    scan_labels = []
    timestamps = []

    for s in scans:
        try:
            feats = insat_processor.read_and_calibrate_scan(s["filepath"], roi_name=roi_name, target_grid_size=(64, 64))
            tir1_celsius = feats.get("tir1_celsius")
            if tir1_celsius is not None:
                # Convert Celsius to Kelvin: K = °C + 273.15
                tir1_k = tir1_celsius + 273.15
                feats["tir1_k"] = tir1_k
                feats["tir2_k"] = feats["tir2_celsius"] + 273.15
                feats["wv_k"] = feats["wv_celsius"] + 273.15

                # Severe convective proxy threshold: TIR1 < 235K (-38.15°C)
                convective_mask = (tir1_k < 235.0).astype(int)
                scan_features.append(feats)
                scan_labels.append(convective_mask)
                timestamps.append(s["timestamp_dt"])
                print(f"  Extracted {s['filename']}: TIR1 mean={np.nanmean(tir1_k):.1f}K, min={np.nanmin(tir1_k):.1f}K, convective pixels={np.sum(convective_mask)}/4096 ({np.mean(convective_mask)*100:.2f}%)")
        except Exception as e:
            print(f"  Error processing {s['filename']}: {e}")

    num_scans = len(scan_features)
    print(f"\nExtracted features for {num_scans} consecutive satellite frames.")

    horizons = [30, 60, 90]

    for h in horizons:
        print(f"\n" + "-" * 60)
        print(f"EVALUATION FOR FORECAST HORIZON: +{h} MINUTES")
        print("-" * 60)

        y_true_all = []
        y_prob_hgb_all = []
        y_prob_convlstm_all = []
        y_prob_pers_all = []

        valid_pairs_count = 0

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

            valid_pairs_count += 1
            t0_feats = scan_features[i]
            t_target_label = scan_labels[target_idx]
            t0_label = scan_labels[i]

            # 1. HistGradientBoosting prediction
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
                except Exception as e:
                    pass

            # 2. ConvLSTM prediction
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

            y_true_all.extend(t_target_label.flatten())
            y_prob_hgb_all.extend(prob_hgb.flatten())
            y_prob_convlstm_all.extend(prob_convlstm.flatten())
            y_prob_pers_all.extend(t0_label.flatten())

        if valid_pairs_count == 0:
            print(f"  WARNING: 0 valid observation pairs available for lead time +{h} min!")
            print(f"  Metrics cannot be calculated reliably due to missing future observation frames.")
            continue

        print(f"  Valid forecast-target pairs evaluated: {valid_pairs_count} pairs ({len(y_true_all)} total pixel evaluations)")

        # Persistence Baseline
        pers_metrics = evaluate_metrics(y_true_all, y_prob_pers_all, threshold=0.5)
        print(f"\n  1. [PERSISTENCE BASELINE (+{h}m)]")
        print(f"     Samples: {pers_metrics['total_samples']} | Positives: {pers_metrics['positives']} (Prevalence: {pers_metrics['prevalence']})")
        print(f"     Matrix: TN={pers_metrics['confusion_matrix']['TN']}, FP={pers_metrics['confusion_matrix']['FP']}, FN={pers_metrics['confusion_matrix']['FN']}, TP={pers_metrics['confusion_matrix']['TP']}")
        print(f"     POD/Recall: {pers_metrics['recall_pod']} | Precision: {pers_metrics['precision']} | FAR: {pers_metrics['far']} | CSI: {pers_metrics['csi']} | F1: {pers_metrics['f1']}")
        print(f"     ROC-AUC: {pers_metrics['roc_auc']} | PR-AUC: {pers_metrics['pr_auc']} | Brier: {pers_metrics['brier_score']}")

        # HistGradientBoosting Model
        hgb_metrics = evaluate_metrics(y_true_all, y_prob_hgb_all, threshold=0.35)
        print(f"\n  2. [HISTGRADIENTBOOSTING SATELLITE MODEL (+{h}m)]")
        print(f"     Matrix: TN={hgb_metrics['confusion_matrix']['TN']}, FP={hgb_metrics['confusion_matrix']['FP']}, FN={hgb_metrics['confusion_matrix']['FN']}, TP={hgb_metrics['confusion_matrix']['TP']}")
        print(f"     POD/Recall: {hgb_metrics['recall_pod']} | Precision: {hgb_metrics['precision']} | FAR: {hgb_metrics['far']} | CSI: {hgb_metrics['csi']} | F1: {hgb_metrics['f1']}")
        print(f"     ROC-AUC: {hgb_metrics['roc_auc']} | PR-AUC: {hgb_metrics['pr_auc']} | Brier: {hgb_metrics['brier_score']}")

        # ConvLSTM Model
        conv_metrics = evaluate_metrics(y_true_all, y_prob_convlstm_all, threshold=0.15)
        print(f"\n  3. [CONVLSTM SPATIOTEMPORAL MODEL (+{h}m)]")
        print(f"     Matrix: TN={conv_metrics['confusion_matrix']['TN']}, FP={conv_metrics['confusion_matrix']['FP']}, FN={conv_metrics['confusion_matrix']['FN']}, TP={conv_metrics['confusion_matrix']['TP']}")
        print(f"     POD/Recall: {conv_metrics['recall_pod']} | Precision: {conv_metrics['precision']} | FAR: {conv_metrics['far']} | CSI: {conv_metrics['csi']} | F1: {conv_metrics['f1']}")
        print(f"     ROC-AUC: {conv_metrics['roc_auc']} | PR-AUC: {conv_metrics['pr_auc']} | Brier: {conv_metrics['brier_score']}")

if __name__ == "__main__":
    main()
