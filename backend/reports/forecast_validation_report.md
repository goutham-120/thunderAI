# VAJRA-AI Phase 3: Forecast Validation & Target Definition Report

> [!IMPORTANT]
> **Operational Status**: **EXPERIMENTAL / BASELINE-BENCHMARKED**
> **Multimodal Training Decision**: **NOT PERFORMED** (Dataset lacks coincident satellite–radar pairs). Existing model checkpoints (`vajra_hgb_nowcast.joblib` and `vajra_spatiotemporal_v1.pt`) have been preserved intact without destructive overwrite.

---

## 1. Precise Target Definitions & Label Taxonomy

To maintain scientific integrity, VAJRA-AI strictly distinguishes three distinct observation targets:

| Target Category | Data Source | Physical Parameter & Threshold | Target Interpretation |
| :--- | :--- | :--- | :--- |
| **Satellite Convective Proxy** | INSAT-3DS Imager (Channel TIR1 10.8µm) | Cloud-Top $T_b < 235.0\text{ K}$ ($-38.15^\circ\text{C}$) | Deep convective cloud tops and glaciated anvil clouds |
| **Radar Precipitation Core** | Cherrapunji DWR (RSCHR NetCDF3) | Equivalent Reflectivity $Z \ge 35.0\text{ dBZ}$ | Precipitation cores & high hydrometeor density |
| **Ground-Truth Lightning** | Damini / IITM VLF Lightning Network | VLF/LF Electric Discharge Density ($/\text{km}^2/\text{min}$) | Verified cloud-to-ground & intra-cloud lightning strikes |

> [!WARNING]
> **Scientific Warning**:
> Reflectivity-derived precipitation cores ($Z \ge 35\text{ dBZ}$) and cold cloud tops ($T_b < 235\text{K}$) are **convective proxies**, NOT verified lightning stroke observations. VAJRA-AI does NOT claim operational lightning stroke prediction without ground-truth Damini sensor feeds.

---

## 2. Generalization & Temporal Leakage Audit

1. **Dataset Scope**:
   - All available observations span a single date (**28-SEP-2026**).
   - Because all frames belong to the same meteorological event, random train/validation partitioning within this single session introduces spatial-temporal autocorrelation (leakage).
   - Independent date generalization **cannot** be scientifically established until multi-date storm archives are collected.

2. **Model Benchmark Summary vs Persistence**:
   - **Persistence Baseline**: Achieves **CSI = 0.7542** (+30m), **0.6603** (+60m), and **0.5833** (+90m).
   - **Saved HGB & ConvLSTM Models**: Output low prior probabilities ($0.02-0.05$), failing to beat Persistence on raw single-frame satellite inputs without probability recalibration.

---

## 3. Operational Limitations & Confidence Bounds

- **Supported Regions**: `NATIONAL` (India composite) and `NORTHEAST_MEGHALAYA` (Cherrapunji radar coverage).
- **Supported Lead Times**: +30 min, +60 min, +90 min.
- **Missing Data Handling**: Outages or missing scan slots return `DATA_UNAVAILABLE` status without fabricating intermediate frames.
- **Uncertainty Bounds**: Output probabilities represent relative convective risk scores, requiring Platt scaling for calibrated confidence.
