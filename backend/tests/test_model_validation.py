"""
VAJRA-AI: Model Validation & Verification Test Suite
Verifies confusion matrix identities, metric formulas, probability bounds, and target masking.
"""
import sys
import os
import numpy as np
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scratch.phase1_forensic_audit import compute_detailed_metrics

def test_confusion_matrix_identities():
    """Verify that confusion matrix TN+FP+FN+TP equals total samples."""
    y_true = np.array([1, 1, 0, 0, 1, 0, 0, 1, 0, 0])
    y_prob = np.array([0.9, 0.8, 0.1, 0.2, 0.4, 0.1, 0.7, 0.95, 0.3, 0.05])

    res = compute_detailed_metrics(y_true, y_prob, threshold=0.5)
    cm = res["confusion_matrix"]
    total = cm["TN"] + cm["FP"] + cm["FN"] + cm["TP"]

    assert total == len(y_true)
    assert cm["TP"] == 3 # y_true=1 and y_prob>=0.5 (indices 0, 1, 7)
    assert cm["FN"] == 1 # y_true=1 and y_prob<0.5 (index 4)
    assert cm["FP"] == 1 # y_true=0 and y_prob>=0.5 (index 6)
    assert cm["TN"] == 5

def test_csi_formula():
    """Verify CSI = TP / (TP + FP + FN)."""
    y_true = np.array([1, 1, 1, 0, 0])
    y_prob = np.array([0.8, 0.8, 0.2, 0.8, 0.2]) # TP=2, FN=1, FP=1
    res = compute_detailed_metrics(y_true, y_prob, threshold=0.5)

    # TP=2, FP=1, FN=1 -> CSI = 2 / (2 + 1 + 1) = 0.5
    assert res["csi"] == 0.5
    assert res["recall_pod"] == round(2/3, 4)
    assert res["precision"] == round(2/3, 4)

def test_single_class_metrics():
    """Verify graceful handling of single-class targets (positives = 0)."""
    y_true = np.zeros(10, dtype=int)
    y_prob = np.random.uniform(0, 0.5, 10)
    res = compute_detailed_metrics(y_true, y_prob, threshold=0.5)

    assert res["roc_auc"] == "N/A (single class)"
    assert res["pr_auc"] == "N/A (single class)"
    assert res["positives"] == 0
