"""
Forecast & Nowcast API Router
"""
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from typing import Optional
from app.services.forecast_engine import forecast_engine
from app.config import config

router = APIRouter(prefix="/api/forecast", tags=["Forecast"])

# ── What-If Schema ─────────────────────────────────────────────────────────────

class WhatIfRequest(BaseModel):
    temperature_c: float = Field(default=28.5, ge=-20.0, le=55.0, description="Air temperature (°C)")
    relative_humidity_percent: float = Field(default=75.0, ge=0.0, le=100.0, description="Relative humidity (%)")
    cape_jkg: float = Field(default=1800.0, ge=0.0, le=6000.0, description="CAPE (J/kg)")
    cin_jkg: float = Field(default=25.0, ge=0.0, le=500.0, description="CIN (J/kg)")
    wind_speed_kmh: float = Field(default=20.0, ge=0.0, le=200.0, description="10-m wind speed (km/h)")
    wind_direction: Optional[str] = Field(default="SE", description="Wind direction compass label")
    wind_shear_ms: float = Field(default=15.0, ge=0.0, le=60.0, description="0-6 km wind shear (m/s)")
    precipitable_water_mm: float = Field(default=50.0, ge=0.0, le=100.0, description="Total precipitable water (mm)")
    radar_dbz: float = Field(default=45.0, ge=0.0, le=75.0, description="Peak radar reflectivity (dBZ)")
    cloud_top_temp_c: float = Field(default=-55.0, ge=-100.0, le=30.0, description="Cloud-top temperature (°C)")
    lightning_flash_rate_min: float = Field(default=10.0, ge=0.0, le=100.0, description="Lightning flash rate (flashes/min)")
    horizon_min: int = Field(default=30, description="Forecast horizon (minutes)")

    class Config:
        json_schema_extra = {
            "example": {
                "temperature_c": 33.0,
                "relative_humidity_percent": 88.0,
                "cape_jkg": 2800.0,
                "cin_jkg": 10.0,
                "wind_speed_kmh": 35.0,
                "wind_direction": "SE",
                "wind_shear_ms": 22.0,
                "precipitable_water_mm": 60.0,
                "radar_dbz": 58.0,
                "cloud_top_temp_c": -65.0,
                "lightning_flash_rate_min": 25.0,
                "horizon_min": 30
            }
        }

@router.get("/latest")
def get_latest_nowcast(
    horizon_min: int = Query(30, description="Forecast lead time in minutes (15, 30, 45, 60, 90, 120, 180)"),
    event_id: str = Query("LIVE", description="Event ID: LIVE, HYD-PREMONSOON-2024, ODISHA-KALBAISAKHI-2024, etc."),
    t_offset_minutes: int = Query(0, description="Timeline playback offset in minutes"),
    region_name: str = Query(None, description="Selected Region or State name"),
    lat: float = Query(None, description="Target Latitude"),
    lon: float = Query(None, description="Target Longitude"),
    min_lat: float = Query(None, description="Bounding Area Min Latitude"),
    max_lat: float = Query(None, description="Bounding Area Max Latitude"),
    min_lon: float = Query(None, description="Bounding Area Min Longitude"),
    max_lon: float = Query(None, description="Bounding Area Max Longitude")
):
    return forecast_engine.get_complete_nowcast(
        horizon_min=horizon_min,
        event_id=event_id,
        t_offset_minutes=t_offset_minutes,
        region_name=region_name,
        lat=lat, lon=lon,
        min_lat=min_lat, max_lat=max_lat,
        min_lon=min_lon, max_lon=max_lon
    )

@router.get("/horizons")
def get_available_horizons():
    return {
        "available_horizons_minutes": config.HORIZONS_MINUTES,
        "default_horizon_minutes": 30
    }

@router.get("/area")
def analyze_area_nowcast(
    lat: float = Query(None, description="Target Latitude for Point Selection"),
    lon: float = Query(None, description="Target Longitude for Point Selection"),
    min_lat: float = Query(None, description="Bounding Area Min Latitude"),
    max_lat: float = Query(None, description="Bounding Area Max Latitude"),
    min_lon: float = Query(None, description="Bounding Area Min Longitude"),
    max_lon: float = Query(None, description="Bounding Area Max Longitude"),
    horizon_min: int = Query(30, description="Lead time horizon in minutes"),
    event_id: str = Query("LIVE", description="Event ID")
):
    return forecast_engine.analyze_area_nowcast(
        lat=lat, lon=lon,
        min_lat=min_lat, max_lat=max_lat,
        min_lon=min_lon, max_lon=max_lon,
        horizon_min=horizon_min, event_id=event_id
    )

@router.get("/model-metrics")
def get_model_metrics():
    """
    Returns validation metrics, target definitions, training dataset parameters, and model provenance.
    """
    import os, json
    report_path = os.path.join(os.path.dirname(__file__), "..", "weights", "training_report.json")
    if os.path.exists(report_path):
        with open(report_path, "r") as f:
            return json.load(f)
    return {
        "status": "UNAVAILABLE",
        "reason": "Training report file not found"
    }

@router.get("/ml-nowcast")
def get_ml_nowcast(
    horizon_min: int = Query(30, description="Forecast lead time in minutes (15, 30, 45, 60, 90, 120, 180)"),
    roi_name: str = Query("AP_TELANGANA", description="Region of Interest")
):
    """
    Executes direct ML nowcasting model inference on calibrated INSAT-3DS sequence frames.
    """
    from app.services.insat_3ds_processor import insat_processor
    from app.models.spatiotemporal_net import ai_engine
    from app.services.data_harmonizer import harmonizer

    inventory = insat_processor.scan_inventory()
    cube = harmonizer.get_convective_cube(data_mode="real")
    tensor_4d = cube["tensor"]

    predictions = ai_engine.predict_horizons(tensor_4d=tensor_4d, horizons_min=[horizon_min])
    selected = predictions.get(horizon_min, list(predictions.values())[0])

    return {
        "status": "success",
        "horizon_minutes": horizon_min,
        "roi_name": roi_name,
        "model_status": ai_engine.model_status,
        "inference_mode": ai_engine.inference_mode,
        "model_provenance": ai_engine.get_model_provenance(),
        "input_inventory_scans": len(inventory),
        "prediction": {
            "p_thunderstorm_max": round(float(selected["p_thunderstorm"].max()), 4),
            "p_lightning_max": round(float(selected["p_lightning"].max()), 4),
            "rainfall_max_mmh": round(float(selected["rainfall_mmh"].max()), 2),
            "pred_dbz_max": round(float(selected["pred_dbz"].max()), 2),
            "uncertainty_index": selected["uncertainty_index"],
            "inference_engine": selected["inference_engine"]
        }
    }

# ── What-If Scenario Endpoint ─────────────────────────────────────────────────

@router.post("/what-if")
def run_what_if_scenario(body: WhatIfRequest):
    """
    WHAT-IF SCENARIO — Accepts hypothetical atmospheric conditions and returns
    a simulated nowcast response.

    This endpoint is COMPLETELY ISOLATED from the live forecast pipeline.
    It does NOT read or write live sensor data, historical observations, or
    the real-time forecast state. All outputs are clearly labelled WHAT_IF / SIMULATION.
    No real CAP alert is ever generated from this endpoint.
    """
    import numpy as np
    from app.models.spatiotemporal_net import ai_engine
    from app.services.xai_engine import xai_engine
    from datetime import datetime, timezone

    # ── Validate horizon is one of the supported values ──────────────────────
    supported_horizons = config.HORIZONS_MINUTES  # [15, 30, 45, 60, 90, 120, 180]
    if body.horizon_min not in supported_horizons:
        # Clamp to nearest supported value
        body.horizon_min = min(supported_horizons, key=lambda h: abs(h - body.horizon_min))

    # ── Build a synthetic 4D tensor [T=5, H=64, W=64, C=8] from scalar inputs ─
    # Channels: [radar_dbz, radial_velocity, sat_tir_k, water_vapor_k,
    #            lightning_density, cape, cin, wind_shear]
    T, H, W = 5, 64, 64

    # Scalar → spatial: create a Gaussian bell centred on the grid
    centre_r, centre_c = H // 2, W // 2
    rr, cc = np.meshgrid(np.arange(H), np.arange(W), indexing="ij")
    dist_sq = (rr - centre_r) ** 2 + (cc - centre_c) ** 2
    sigma = 12.0
    gauss = np.exp(-dist_sq / (2 * sigma ** 2))   # peak 1.0 at centre

    dbz_grid     = np.clip(body.radar_dbz * gauss, 0.0, 75.0).astype(np.float32)
    vel_grid     = (body.wind_speed_kmh / 3.6 * gauss).astype(np.float32)  # km/h → m/s proxy
    tir_grid     = np.full((H, W), (body.cloud_top_temp_c + 273.15), dtype=np.float32)
    wv_grid      = np.full((H, W), (body.precipitable_water_mm + 220.0), dtype=np.float32)
    lig_grid     = np.clip(body.lightning_flash_rate_min * gauss, 0.0, 100.0).astype(np.float32)
    cape_grid    = np.full((H, W), body.cape_jkg, dtype=np.float32)
    cin_grid     = np.full((H, W), body.cin_jkg, dtype=np.float32)
    shear_grid   = np.full((H, W), body.wind_shear_ms, dtype=np.float32)

    single_frame = np.stack(
        [dbz_grid, vel_grid, tir_grid, wv_grid, lig_grid, cape_grid, cin_grid, shear_grid],
        axis=-1
    )  # [64, 64, 8]

    # Repeat for T=5 timesteps (static scenario — no temporal evolution)
    tensor_4d = np.stack([single_frame] * T, axis=0)  # [5, 64, 64, 8]

    # ── Run existing AI engine (reused, not modified) ─────────────────────────
    try:
        pred_dict = ai_engine.predict_horizons(
            tensor_4d=tensor_4d,
            horizons_min=supported_horizons,
            storm_motion_deg=135.0,
            storm_speed_kmh=body.wind_speed_kmh
        )
        selected = pred_dict.get(body.horizon_min, pred_dict[supported_horizons[0]])
        inference_engine = selected.get("inference_engine", ai_engine.inference_mode)
        model_available = True
    except Exception as model_err:
        # If the model is completely unavailable, fall back to pure heuristics
        model_available = False
        inference_engine = "HEURISTIC_ONLY"
        p_thu_scalar = float(np.clip(1.0 / (1.0 + np.exp(-(body.radar_dbz - 35.0) / 7.0)), 0.01, 0.99))
        p_lig_scalar = float(np.clip(body.lightning_flash_rate_min * 0.15 + (0.4 if body.radar_dbz > 38 else 0.05), 0.01, 0.96))
        rain_scalar  = float(np.clip(((10.0 ** (body.radar_dbz / 10.0)) / 200.0) ** (1.0 / 1.6) if body.radar_dbz > 15 else 0.0, 0.0, 120.0))
        selected = {
            "p_thunderstorm": np.full((H, W), p_thu_scalar, dtype=np.float32),
            "p_lightning":    np.full((H, W), p_lig_scalar, dtype=np.float32),
            "rainfall_mmh":   np.full((H, W), rain_scalar,  dtype=np.float32),
            "pred_dbz":       dbz_grid,
            "uncertainty_index": 0.45
        }

    # ── Extract scalar summary values ─────────────────────────────────────────
    p_thunder_max  = round(float(np.max(selected["p_thunderstorm"])) * 100, 1)
    p_lightning_max= round(float(np.max(selected["p_lightning"])) * 100, 1)
    rain_max       = round(float(np.max(selected["rainfall_mmh"])), 2)
    pred_dbz_max   = round(float(np.max(selected["pred_dbz"])), 1)
    uncertainty    = round(float(selected.get("uncertainty_index", 0.3)), 3)

    # ── Run XAI engine (reused, not modified) ─────────────────────────────────
    wind_shear_kts = body.wind_shear_ms * 1.944  # m/s → knots
    xai = xai_engine.explain_cell_or_point(
        p_thunder=float(np.max(selected["p_thunderstorm"])),
        p_lightning=float(np.max(selected["p_lightning"])),
        max_dbz=body.radar_dbz,
        cloud_top_c=body.cloud_top_temp_c,
        cape_jkg=body.cape_jkg,
        cin_jkg=body.cin_jkg,
        wind_shear_kts=wind_shear_kts,
        lightning_rate=body.lightning_flash_rate_min
    )

    # ── Severity classification ───────────────────────────────────────────────
    threat_level = (
        "CRITICAL" if p_thunder_max > 70 else
        "HIGH"     if p_thunder_max > 40 else
        "MODERATE" if p_thunder_max > 20 else
        "LOW"
    )

    # ── Multi-horizon probability curve for the selected scenario ─────────────
    horizon_curve = []
    for h in supported_horizons:
        p = pred_dict.get(h, selected) if model_available else selected
        horizon_curve.append({
            "horizon_min": h,
            "label": f"+{h}m",
            "thunderstorm_prob_pct": round(float(np.max(p["p_thunderstorm"])) * 100, 1),
            "lightning_prob_pct":    round(float(np.max(p["p_lightning"])) * 100, 1),
            "rainfall_mmh":          round(float(np.max(p["rainfall_mmh"])), 2),
            "pred_dbz":              round(float(np.max(p["pred_dbz"])), 1)
        })

    return {
        # ── Identity — NEVER label as REAL or LIVE ───────────────────────────
        "mode": "WHAT_IF",
        "data_integrity_notice": (
            "HYPOTHETICAL SCENARIO — NOT A REAL OBSERVATION OR LIVE FORECAST. "
            "No real CAP alert has been issued. This result must not be used for "
            "operational decision-making or presented as sensor data."
        ),
        "status": "success",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "horizon_min": body.horizon_min,

        # ── Echo user inputs ──────────────────────────────────────────────────
        "hypothetical_conditions": {
            "temperature_c":              body.temperature_c,
            "relative_humidity_percent":  body.relative_humidity_percent,
            "cape_jkg":                   body.cape_jkg,
            "cin_jkg":                    body.cin_jkg,
            "wind_speed_kmh":             body.wind_speed_kmh,
            "wind_direction":             body.wind_direction,
            "wind_shear_ms":              body.wind_shear_ms,
            "wind_shear_kts":             round(wind_shear_kts, 1),
            "precipitable_water_mm":      body.precipitable_water_mm,
            "radar_dbz":                  body.radar_dbz,
            "cloud_top_temp_c":           body.cloud_top_temp_c,
            "lightning_flash_rate_min":   body.lightning_flash_rate_min
        },

        # ── Simulated model response ──────────────────────────────────────────
        "simulated_response": {
            "thunderstorm_prob_pct":  p_thunder_max,
            "lightning_prob_pct":     p_lightning_max,
            "rainfall_max_mmh":       rain_max,
            "pred_dbz_max":           pred_dbz_max,
            "threat_level":           threat_level,
            "uncertainty_index":      uncertainty,
            "inference_engine":       inference_engine,
            "model_status":           ai_engine.model_status,
            "inference_mode":         ai_engine.inference_mode,
        },

        # ── XAI attribution ──────────────────────────────────────────────────
        "xai_explanation": xai,

        # ── Multi-horizon curve ───────────────────────────────────────────────
        "horizon_curve": horizon_curve,

        # ── Provenance ───────────────────────────────────────────────────────
        "provenance": {
            "source": "VAJRA-AI What-If Simulation Engine",
            "based_on": "Synthetic tensor constructed from user-defined scalar inputs",
            "real_data_used": False,
            "model_used": "ConvLSTM Encoder-Decoder v1" if ai_engine.inference_mode == "CONVLSTM" else "Heuristic Fallback",
            "model_available": model_available
        }
    }
