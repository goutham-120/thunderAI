# VAJRA-AI Phase 1: Forensic Model Validation Audit Report

> [!NOTE]
> **Audit Date**: 2026-09-29 | **Evaluated ROI**: `NATIONAL` | **Target Proxy**: Severe Convection ($T_b < 235\text{K}$)

---

## 1. Executive Summary & Forensic Findings

A comprehensive forensic audit of the saved model artifacts (`vajra_hgb_nowcast.joblib` and `vajra_spatiotemporal_v1.pt`) was conducted across the 9 INSAT-3DS geostationary satellite scans on 28-SEP-2026.

### Key Forensic Audit Discoveries:
1. **HistGradientBoosting Probability Collapse**:
   - The saved `vajra_hgb_nowcast.joblib` model outputs a **constant probability vector of 0.0500** across all 24,576 evaluated pixel samples.
   - At the default threshold of $0.35$, it predicts **0 True Positives** ($POD = 0.0$, $CSI = 0.0$). Even when lowering the threshold to $0.04$, it predicts 100% positive classifications ($FAR = 0.9706$, $CSI = 0.0294$), demonstrating zero discriminative signal on out-of-sample raw satellite inputs.

2. **ConvLSTM Checkpoint Probability Distribution**:
   - The saved `vajra_spatiotemporal_v1.pt` checkpoint outputs probabilities bounded between **$0.01459$ and $0.16116$**, with a mean of **$0.0173$** and median ($P_{50}$) of **$0.0146$**.
   - At threshold $0.15$, only 6 out of 24,576 pixels exceed threshold (all false positives), resulting in $POD = 0.0$ and $CSI = 0.0$.

3. **Dominance of Persistence Baseline**:
   - Mesoscale convective systems exhibit strong spatiotemporal persistence over 1–3 hours.
   - The **Persistence baseline** ($Y_{t+h} = Y_t$) achieves **CSI = 0.7542** at +30 min, **0.6603** at +60 min, and **0.5833** at +90 min, with $ROC-AUC > 0.87$.

---

## 2. Quantitative Verification Metrics Table

### Forecast Horizon +30 Minutes (6 Evaluation Pairs, 24,576 Total Samples, Positive Class Prevalence = 2.94%)
| Model / Baseline | Decision Threshold | Positives (TP/FN) | False Alarms (FP) | POD / Recall | Precision | FAR | CSI | F1 Score | ROC-AUC | PR-AUC | Brier Score |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Persistence Baseline** | `0.50` | 632 / 91 | 115 | **0.8741** | **0.8461** | **0.1539** | **0.7542** | **0.8599** | **0.9347** | **0.8619** | **0.0084** |
| **HistGradientBoosting (Default)** | `0.35` | 0 / 723 | 0 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.5000 | 0.5147 | 0.0290 |
| **HistGradientBoosting (Calibrated)** | `0.04` | 723 / 0 | 23,853 | 1.0000 | 0.0294 | 0.9706 | 0.0294 | 0.0572 | 0.5000 | 0.5147 | 0.0290 |
| **ConvLSTM Checkpoint** | `0.15` | 0 / 723 | 6 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.5724 | 0.0416 | 0.0288 |

### Forecast Horizon +60 Minutes (5 Evaluation Pairs, 20,480 Total Samples, Positive Class Prevalence = 2.87%)
| Model / Baseline | Decision Threshold | Positives (TP/FN) | False Alarms (FP) | POD / Recall | Precision | FAR | CSI | F1 Score | ROC-AUC | PR-AUC | Brier Score |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Persistence Baseline** | `0.50` | 486 / 102 | 148 | **0.8265** | **0.7666** | **0.2334** | **0.6603** | **0.7954** | **0.9095** | **0.7990** | **0.0122** |
| **HistGradientBoosting (Default)** | `0.35` | 0 / 588 | 0 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.5000 | 0.5144 | 0.0283 |
| **ConvLSTM Checkpoint** | `0.15` | 0 / 588 | 5 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.2805 | 0.0211 | 0.0282 |

### Forecast Horizon +90 Minutes (5 Evaluation Pairs, 20,480 Total Samples, Positive Class Prevalence = 2.99%)
| Model / Baseline | Decision Threshold | Positives (TP/FN) | False Alarms (FP) | POD / Recall | Precision | FAR | CSI | F1 Score | ROC-AUC | PR-AUC | Brier Score |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Persistence Baseline** | `0.50` | 469 / 143 | 192 | **0.7663** | **0.7095** | **0.2905** | **0.5833** | **0.7368** | **0.8783** | **0.7414** | **0.0164** |
| **HistGradientBoosting (Default)** | `0.35` | 0 / 612 | 0 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.5000 | 0.5149 | 0.0294 |
| **ConvLSTM Checkpoint** | `0.15` | 0 / 612 | 5 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.5479 | 0.0370 | 0.0293 |

---

## 3. Detailed Investigation of Model Discrepancies

1. **Confusion Matrix Sum Identity**:
   - For +30 min: $23738 + 115 + 91 + 632 = 24,576$ (100% exact sample count match).
   - For +60 min: $19744 + 148 + 102 + 486 = 20,480$ (100% exact sample count match).
   - For +90 min: $19676 + 192 + 143 + 469 = 20,480$ (100% exact sample count match).

2. **Probability Calibration & Scaling Issues**:
   - The tabular HGB model requires multi-temporal feature differences and normalized features that were not preserved during inference, collapsing output probabilities to the static prior mean ($0.05$).
   - The ConvLSTM model's final sigmoid activation maps logits to a compressed range ($0.014 - 0.161$), requiring probability recalibration (Platt scaling or isotonic regression) before applying hard thresholds.

3. **Data Leakage & Baseline Verification**:
   - The Persistence baseline uses only observation $Y_t$ at time $t$ to forecast $Y_{t+h}$ at time $t+h$. No future information or neighboring time frames are leaked.
