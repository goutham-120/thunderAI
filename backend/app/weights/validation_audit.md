# VAJRA-AI Scientific Validation & Numerical Audit Report

**Audit Timestamp**: `2026-09-29T14:24:07.600994+00:00`  
**Status**: **MATHEMATICALLY_VERIFIED_NUMERICAL_AUDIT**  
**Data Source**: INSAT-3DS L1C SGP Calibrated Satellite Scans (Sept 28, 2026, 18:00 to 23:30 UTC)  
**Sequence Split**: Non-overlapping sequence split (Scans 0-5 Train / Scans 6-8 Validation)

---

## 1. Audited Forecast Horizon Metrics & Baseline Comparisons

### A. +30-Minute Lead Time Horizon
* **Train Samples**: 12288 | **Validation Samples**: 12288
* **Optimal Train Threshold**: `0.278`

| Metric | HistGradientBoosting (Default 0.50) | HistGradientBoosting (Calibrated 0.278) | Persistence Baseline |
| :--- | :---: | :---: | :---: |
| **Confusion Matrix (TP/FP/FN/TN)** | `562/65/1240/10421` | `962/680/840/9806` | `637/151/1165/10335` |
| **Class Prevalence** | `14.66%` | `14.66%` | `14.66%` |
| **ROC-AUC (Ranking)** | **0.8841** | **0.8841** | 0.6695 |
| **PR-AUC (Ranking)** | **0.6574** | **0.6574** | 0.6283 |
| **Brier Calibration Score** | **0.0798** | **0.0798** | 0.1071 |
| **Precision** | **0.8963** | 0.5859 | 0.8084 |
| **Recall / POD** | 0.3119 | **0.5339** | 0.3535 |
| **FAR (False Alarm Ratio)** | **0.1037** | 0.4141 | 0.1916 |
| **CSI (Critical Success Index)** | 0.301 | **0.3876** | 0.3262 |
| **F1-Score** | 0.4627 | **0.5587** | 0.4919 |

### B. +60-Minute Lead Time Horizon
* **Train Samples**: 12288 | **Validation Samples**: 8192
* **Optimal Train Threshold**: `0.311`

| Metric | HistGradientBoosting (Default 0.50) | HistGradientBoosting (Calibrated 0.311) | Persistence Baseline |
| :--- | :---: | :---: | :---: |
| **Confusion Matrix (TP/FP/FN/TN)** | `356/81/1032/6723` | `748/740/640/6064` | `389/155/999/6649` |
| **ROC-AUC (Ranking)** | **0.8496** | **0.8496** | 0.6287 |
| **Brier Calibration Score** | **0.1002** | **0.1002** | 0.1409 |

### C. +90-Minute Lead Time Horizon
* **Train Samples**: 16384 | **Validation Samples**: 4096
* **Optimal Train Threshold**: `0.34`

| Metric | HistGradientBoosting (Default 0.50) | HistGradientBoosting (Calibrated 0.34) | Persistence Baseline |
| :--- | :---: | :---: | :---: |
| **Confusion Matrix (TP/FP/FN/TN)** | `198/86/552/3260` | `487/661/263/2685` | `179/88/571/3258` |
| **ROC-AUC (Ranking)** | **0.8313** | **0.8313** | 0.6062 |

---

## 2. ConvLSTM 65,536-Pixel Confusion Matrix Reconciliation

* **Validation Population**: 65536 Total Pixels (16 Validation Sequences x 64 Rows x 64 Cols = 65,536 Total Pixels)
* **Confusion Matrix at Threshold 0.15**:
  - `TP`: 7
  - `FP`: 9
  - `FN`: 3372
  - `TN`: 62148
  - **Sum**: `65536` (Matches 65,536 pixels)
* **Exact Precision**: `7 / (7 + 9) = 7 / 16 = 0.4375 (43.75%)`

---

## 3. Generalization Scope & Required Operational Next Steps

> [!CAUTION] Operational Readiness Disclaimer
> All metrics reflect single-date sequence validation (Sept 28, 2026). Independent multi-date multi-season generalization cannot be established without multi-date archives.

### Required Steps for Operational Evaluation:
1. Ingest multi-month INSAT-3DS L1C HDF5 archives across Premonsoon and Monsoon seasons from MOSDAC.
2. Establish multi-date Train / Validation / Test event splits grouped strictly by storm event date.
3. Connect live IITM / IMD Damini lightning flash rate network sensors to establish true ground-truth lightning observation target labels.
