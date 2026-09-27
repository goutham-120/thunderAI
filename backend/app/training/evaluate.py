"""
Evaluation Metrics Engine for VAJRA-AI Spatiotemporal Models
Calculates:
- Classification: Precision, Recall, F1-score, PR-AUC, ROC-AUC, Brier score
- Regression: MAE, RMSE
"""
import numpy as np
from typing import Dict, Any, Tuple
from sklearn.metrics import (
    precision_score, recall_score, f1_score,
    precision_recall_curve, roc_auc_score, auc, brier_score_loss
)

def evaluate_classification_metrics(y_true: np.ndarray, y_pred_prob: np.ndarray, threshold: float = 0.5) -> Dict[str, float]:
    """
    Computes classification performance metrics for thunderstorm and lightning probability grids.
    """
    y_true_flat = y_true.flatten()
    y_prob_flat = y_pred_prob.flatten()
    y_bin_flat = (y_prob_flat >= threshold).astype(int)

    # Handle edge case where all targets are 0 or 1
    has_positive = np.sum(y_true_flat == 1) > 0
    has_negative = np.sum(y_true_flat == 0) > 0

    prec = float(precision_score(y_true_flat, y_bin_flat, zero_division=0))
    rec = float(recall_score(y_true_flat, y_bin_flat, zero_division=0))
    f1 = float(f1_score(y_true_flat, y_bin_flat, zero_division=0))
    brier = float(brier_score_loss(y_true_flat, y_prob_flat))

    if has_positive and has_negative:
        try:
            roc_auc = float(roc_auc_score(y_true_flat, y_prob_flat))
            p_curve, r_curve, _ = precision_recall_curve(y_true_flat, y_prob_flat)
            pr_auc = float(auc(r_curve, p_curve))
        except Exception:
            roc_auc = 0.5
            pr_auc = 0.0
    else:
        roc_auc = 0.5
        pr_auc = 0.0

    return {
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "pr_auc": round(pr_auc, 4),
        "roc_auc": round(roc_auc, 4),
        "brier_score": round(brier, 4)
    }

def evaluate_regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """
    Computes MAE and RMSE metrics for continuous outputs (rainfall rate, reflectivity dBZ).
    """
    y_true_flat = y_true.flatten()
    y_pred_flat = y_pred.flatten()

    mae = float(np.mean(np.abs(y_true_flat - y_pred_flat)))
    rmse = float(np.sqrt(np.mean((y_true_flat - y_pred_flat) ** 2)))

    return {
        "mae": round(mae, 4),
        "rmse": round(rmse, 4)
    }

def evaluate_model_predictions(
    y_true_dict: Dict[str, np.ndarray],
    y_pred_dict: Dict[str, np.ndarray]
) -> Dict[str, Dict[str, float]]:
    """
    Evaluates full multi-output prediction dictionary.
    """
    results = {}
    if "p_thunderstorm" in y_pred_dict and "p_thunderstorm" in y_true_dict:
        results["p_thunderstorm"] = evaluate_classification_metrics(y_true_dict["p_thunderstorm"], y_pred_dict["p_thunderstorm"])

    if "p_lightning" in y_pred_dict and "p_lightning" in y_true_dict:
        results["p_lightning"] = evaluate_classification_metrics(y_true_dict["p_lightning"], y_pred_dict["p_lightning"])

    if "rainfall_mmh" in y_pred_dict and "rainfall_mmh" in y_true_dict:
        results["rainfall_mmh"] = evaluate_regression_metrics(y_true_dict["rainfall_mmh"], y_pred_dict["rainfall_mmh"])

    if "pred_dbz" in y_pred_dict and "pred_dbz" in y_true_dict:
        results["pred_dbz"] = evaluate_regression_metrics(y_true_dict["pred_dbz"], y_pred_dict["pred_dbz"])

    return results
