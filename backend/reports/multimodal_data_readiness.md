# VAJRA-AI Phase 2: Multimodal Data Readiness & Alignment Report

> [!IMPORTANT]
> **Multimodal Training Decision**: **NO-GO (NOT JUSTIFIED)**
> **Scientific Rationale**: Zero temporally synchronized satellite–radar observation pairs exist in the available September 28, 2026 archive dataset due to a 49.3-minute offset between radar scan termination (17:10:44 UTC) and satellite scan initiation (18:00:00 UTC).

---

## 1. Comprehensive Data Inventory Summary

### A. Geostationary Satellite Dataset (INSAT-3DS L1C SGP HDF5)
- **File Count**: 9 files (`3SIMG_28SEP2026_*_L1C_SGP_V01R00.h5`)
- **Total Volume**: ~415 MB
- **Observation Session**: 28-SEP-2026 18:00:00 UTC to 23:30:00 UTC
- **Channels Included**: TIR1 (10.8µm), TIR2 (12.0µm), Water Vapor (6.8µm), Mid-Wave IR (3.8µm), Visible (0.65µm), SWIR (1.6µm)
- **LUT Calibration**: Active linear/piecewise calibration to Brightness Temperature ($K$) and Albedo (%)
- **Missing Scans**: Intermediate 30-min sequence gaps at 18:30, 19:00, and 21:00 UTC

### B. Doppler Weather Radar Dataset (Cherrapunji RSCHR NetCDF3)
- **File Count**: 20 volume scan files (`RSCHR_28SEP2026_*_L2B_STD.nc`)
- **Total Volume**: ~68 MB
- **Station Coordinates**: $25.2680^\circ\text{N}, 91.7332^\circ\text{E}$ (Altitude: $1313\text{ m}$)
- **Observation Session**: 28-SEP-2026 00:14:01 UTC to 17:10:44 UTC
- **Variables Included**: Equivalent Reflectivity Factor (`DBZ`), Radial Velocity (`VEL`), Spectrum Width (`WIDTH`), Differential Reflectivity (`ZDR`), Differential Phase (`PHIDP`), Correlation Coefficient (`RHOHV`)
- **Outage Intervals**: Massive 10.8-hour outage between 05:03:56 UTC and 15:53:53 UTC

---

## 2. Spatiotemporal Cross-Matching & Alignment Matrix

Evaluated across time tolerances of 5, 10, and 15 minutes:

| Region of Interest (ROI) | Geographic Footprint Bounds | Spatial Alignment Status | Footprint Overlap % | Matched Pairs (5m) | Matched Pairs (10m) | Matched Pairs (15m) |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **`NATIONAL`** | $8.0^\circ\text{N}-36.0^\circ\text{N}, 68.0^\circ\text{E}-96.0^\circ\text{E}$ | `SPATIALLY_ALIGNED` | **100.0%** | 0 | 0 | 0 |
| **`NORTHEAST_MEGHALAYA`** | $24.0^\circ\text{N}-27.0^\circ\text{N}, 90.0^\circ\text{E}-94.0^\circ\text{E}$ | `SPATIALLY_ALIGNED` | **94.2%** | 0 | 0 | 0 |
| **`EAST_COAST`** | $18.0^\circ\text{N}-24.0^\circ\text{N}, 83.0^\circ\text{E}-90.0^\circ\text{E}$ | `SPATIALLY_ALIGNED` | **8.5%** | 0 | 0 | 0 |
| **`AP_TELANGANA`** | $14.0^\circ\text{N}-20.0^\circ\text{N}, 76.0^\circ\text{E}-84.0^\circ\text{E}$ | `NO_SPATIAL_OVERLAP` | **0.0%** | 0 | 0 | 0 |
| **`KARNATAKA`** | $11.0^\circ\text{N}-16.0^\circ\text{N}, 74.0^\circ\text{E}-79.0^\circ\text{E}$ | `NO_SPATIAL_OVERLAP` | **0.0%** | 0 | 0 | 0 |

---

## 3. Data Acquisition & Connector Audit

1. **Local Connector Status**:
   - Ingested files are stored locally under `C:\Users\nalla\Downloads\`.
   - Data paths are dynamically discovered by `RadarLoader` and `INSAT3DSProcessor`.
2. **Download Permissions & External Feeds**:
   - MOSDAC (ISRO Satellite Data Center) and IMD DWR portals require user-specific login session tokens / credentials.
   - Remote auto-download connectors operate under `ARCHIVE_FALLBACK` mode when network credentials are not configured in `.env`.

---

## 4. Sequence & Target Availability for Forecasting

- **Satellite Sequences**:
  - Lead Time +30 min: **6 valid pairs**
  - Lead Time +60 min: **5 valid pairs**
  - Lead Time +90 min: **5 valid pairs**
- **Radar Sequences**: **0 valid pairs** at exact +30 min due to non-uniform 36-minute scan gaps.

---

## 5. Go / No-Go Decision for Multimodal Model Training

**Decision**: **NO-GO (DO NOT TRAIN JOINT MULTIMODAL MODEL)**

**Scientific Justification**:
Training a joint satellite–radar deep neural network (such as a 2-Layer ConvLSTM or multimodal CNN) requires spatially aligned and temporally coincident input pairs $(X_{\text{sat}}(t), X_{\text{radar}}(t))$. Since zero matched pairs exist within $\Delta t \le 15\text{ min}$, pairing satellite images from 20:00 UTC with radar images from 02:00 UTC (18 hours prior) would introduce false physical associations, spatial misalignment, and severe model corruption.
