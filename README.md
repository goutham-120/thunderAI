# VAJRA-AI: Multimodal Spatio-Temporal Nowcasting Platform
### SIH 2026 Problem Statement 26072 | Ministry of Earth Sciences (MoES) / India Meteorological Department (IMD)

> **Theme**: Disaster Management & Convective Storm Nowcasting (0–180 minutes)

---

## 🌟 System Overview
**VAJRA-AI** is a product-grade, multimodal atmospheric AI platform that fuses:
1. **Doppler Weather Radar (DWR)**: Composite Reflectivity (dBZ), Radial Velocity (m/s).
2. **Satellite (INSAT-3D/3DR via ISRO MOSDAC)**: Thermal Infrared (TIR1 Brightness Temperature) & Water Vapor (WV).
3. **Lightning Detection Networks (IITM / Damini)**: Spatial strike density, flash rate acceleration.
4. **Numerical Weather Prediction (NWP / ERA5 / WRF)**: Thermodynamic instability indices (CAPE, CIN, 0-6 km Bulk Wind Shear).

The system generates high-resolution probabilistic nowcasts for the next 15 to 180 minutes, tracks convective storm cells, predicts lifecycle evolution, provides Explainable AI (XAI) meteorological driver attributions, and issues ITU-T X.1303 Common Alerting Protocol (CAP) emergency warnings.

---

## 🚀 Key Features

- **Multimodal Spatiotemporal AI**: ConvLSTM & Spatiotemporal UNet backbone taking 4D synchronized tensors $[T \times H \times W \times C]$.
- **Storm Cell Tracking & Lifecycle Engine**: TITAN/SCIT-style convective cell segmentation, velocity & azimuth vector projection, lifecycle states (*Initiating $\rightarrow$ Rapidly Intensifying $\rightarrow$ Mature $\rightarrow$ Dissipating*), and trajectory uncertainty cones.
- **Explainable AI (XAI)**: SHAP-style thermodynamic attribution decomposing predictions into physical triggers (CAPE, CIN breakdown, cloud-top cooling rate $\Delta T_{IR}/\Delta t$).
- **CAP Emergency Warnings**: Automatic generation of ITU-T X.1303 formatted warnings for Civil Aviation, NDRF, and Power Grid operators.
- **Historical Event Replay**: Interactive historical playback (e.g. *Hyderabad Convective Outbreak*, *Odisha Kalbaisakhi Nor'wester Squall Line*) with ground-truth verification.
- **Meteorological Benchmark Evaluation**: Live comparison against Persistence and Optical Flow baselines on **CSI, POD, FAR, and Brier Score**.

---

## 🏗️ Quick Start

### 1. Launch with One Click
Double-click `start.bat` in the root folder, or run manually:

#### Backend:
```bash
cd backend
set PYTHONPATH=.
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Frontend:
```bash
cd frontend
npm run dev
```

- **Frontend Dashboard**: `http://localhost:5173`
- **FastAPI Interactive Docs**: `http://localhost:8000/docs`
