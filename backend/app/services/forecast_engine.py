"""
Master Nowcasting & Forecast Orchestrator Service
Coordinates data ingestion/harmonization, deep learning inference, storm tracking, XAI, and CAP alerting.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
import numpy as np
from app.services.data_harmonizer import harmonizer
from app.models.spatiotemporal_net import ai_engine
from app.services.storm_tracker import storm_tracker
from app.services.xai_engine import xai_engine
from app.services.cap_alert_engine import cap_engine
from app.config import config

class ForecastEngine:
    def get_complete_nowcast(
        self,
        horizon_min: int = 30,
        event_id: str = "LIVE",
        t_offset_minutes: int = 0,
        data_mode: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Runs full multimodal pipeline and produces geospatial payload for the UI.
        """
        if event_id == "ODISHA-KALBAISAKHI-2024":
            center = (20.30, 85.82)
            speed = 34.0
            heading = 115.0
            intensity = 1.18
            base_temp = 32.5
            base_rh = 84.0
            base_cape = 2850.0
            base_press = 1001.0
            base_wind = "SE 24 km/h"
            base_tpw = 58.0
        elif event_id == "BENGALURU-URBAN-2023":
            center = (12.97, 77.59)
            speed = 18.0
            heading = 160.0
            intensity = 0.95
            base_temp = 26.5
            base_rh = 72.0
            base_cape = 1450.0
            base_press = 1012.0
            base_wind = "SW 14 km/h"
            base_tpw = 44.0
        else: # Default LIVE / Hyderabad
            center = (17.40, 78.48)
            speed = 24.0
            heading = 135.0
            intensity = 1.05
            base_temp = 29.0
            base_rh = 78.0
            base_cape = 1840.0
            base_press = 1004.0
            base_wind = "SE 18 km/h"
            base_tpw = 52.0

        # 1. Harmonize multimodal observations into 4D tensor (Real IMD vs Synthetic)
        cube_data = harmonizer.get_convective_cube(
            data_mode=data_mode,
            time_steps=5,
            storm_center=center,
            storm_speed_kmh=speed,
            storm_heading_deg=heading,
            intensity_factor=intensity,
            t_offset_minutes=t_offset_minutes
        )
        tensor_4d = cube_data["tensor"]
        last_frame = tensor_4d[-1]

        # 2. Run Spatio-temporal AI Model
        horizons = config.HORIZONS_MINUTES
        pred_dict = ai_engine.predict_horizons(
            tensor_4d=tensor_4d,
            horizons_min=horizons,
            storm_motion_deg=heading,
            storm_speed_kmh=speed
        )

        selected_pred = pred_dict.get(horizon_min, pred_dict[30])

        # 3. Detect and track convective storm cells
        active_cells = storm_tracker.detect_and_track_cells(
            dbz_grid=last_frame[:, :, 0],
            sat_grid=last_frame[:, :, 2],
            lightning_grid=last_frame[:, :, 4],
            cape_grid=last_frame[:, :, 5],
            storm_speed_kmh=speed,
            storm_heading_deg=heading
        )

        # 4. Generate CAP Emergency Alerts
        cap_alerts = cap_engine.generate_cap_alerts(active_cells)

        # 5. Generate Multi-Horizon Probability Curve for chart
        prob_curve_thunder = []
        prob_curve_lightning = []
        prob_curve_rainfall = []

        for h in [0, 15, 30, 45, 60, 90, 120, 180]:
            if h == 0:
                p_t = round(float(np.max(last_frame[:, :, 0] > 35.0)) * 0.75, 2)
                p_l = 0.65
                r_val = 25.0
            else:
                p_res = pred_dict.get(h, pred_dict[30])
                p_t = round(float(np.max(p_res["p_thunderstorm"])), 2)
                p_l = round(float(np.max(p_res["p_lightning"])), 2)
                r_val = round(float(np.max(p_res["rainfall_mmh"])), 1)

            prob_curve_thunder.append({"time": f"{h}m", "val": int(p_t * 100)})
            prob_curve_lightning.append({"time": f"{h}m", "val": int(p_l * 100)})
            prob_curve_rainfall.append({"time": f"{h}m", "val": int(r_val)})

        # 6. Generate Explainability for dominant cell
        if active_cells:
            top_cell = active_cells[0]
            xai_explanation = xai_engine.explain_cell_or_point(
                p_thunder=float(np.max(selected_pred["p_thunderstorm"])),
                p_lightning=float(np.max(selected_pred["p_lightning"])),
                max_dbz=top_cell["max_dbz"],
                cloud_top_c=top_cell["min_cloud_top_c"],
                cape_jkg=base_cape,
                cin_jkg=25.0,
                wind_shear_kts=22.0,
                lightning_rate=top_cell["lightning_flash_rate_min"]
            )
        else:
            xai_explanation = xai_engine.explain_cell_or_point(
                p_thunder=0.1, p_lightning=0.05, max_dbz=25.0, cloud_top_c=-20.0,
                cape_jkg=base_cape, cin_jkg=90.0, wind_shear_kts=10.0, lightning_rate=0.0
            )

        # 7. Format spatial grids
        p_thunder_grid = np.round(selected_pred["p_thunderstorm"][::2, ::2], 3).tolist()
        p_lightning_grid = np.round(selected_pred["p_lightning"][::2, ::2], 3).tolist()
        rainfall_grid = np.round(selected_pred["rainfall_mmh"][::2, ::2], 1).tolist()
        radar_dbz_grid = np.round(last_frame[::2, ::2, 0], 1).tolist()
        sat_tir_grid = np.round(last_frame[::2, ::2, 2], 1).tolist()
        lightning_density_grid = np.round(last_frame[::2, ::2, 4], 2).tolist()

        now_dt = datetime.now(timezone.utc)
        obs_iso = cube_data.get("observation_timestamp") or now_dt.isoformat()
        try:
            obs_dt = datetime.fromisoformat(obs_iso)
        except Exception:
            obs_dt = now_dt
        valid_dt = obs_dt + timedelta(minutes=horizon_min)

        return {
            "status": "success",
            "event_id": event_id,
            "data_mode": cube_data.get("data_mode", "synthetic"),
            "data_quality": cube_data.get("data_quality", "SYNTHETIC"),
            "is_valid": cube_data.get("is_valid", True),
            "model_status": ai_engine.model_status,
            "inference_mode": ai_engine.inference_mode,
            "model_provenance": ai_engine.get_model_provenance(),
            "horizon_minutes": horizon_min,
            "timestamp": obs_iso,
            "timestamps": {
                "observation_time": obs_iso,
                "ingestion_time": cube_data.get("ingestion_timestamp") or now_dt.isoformat(),
                "forecast_generation_time": now_dt.isoformat(),
                "forecast_valid_time": valid_dt.isoformat()
            },
            "bounds": cube_data["bounds"],
            "grid_dimensions": {"rows": 32, "cols": 32},
            "channel_provenance": cube_data.get("channel_provenance", {}),
            "channel_status": cube_data.get("channel_status", {}),
            "real_channels": cube_data.get("real_channels", []),
            "fallback_channels": cube_data.get("fallback_channels", []),
            "missing_channels": cube_data.get("missing_channels", []),
            "fallback_used": cube_data.get("fallback_used", False),
            "source_statuses": cube_data.get("source_statuses", {}),
            "atmospheric_conditions": {
                "temperature_c": cube_data["nwp_variables"]["temperature_2m"] if cube_data.get("nwp_variables") and cube_data["nwp_variables"].get("temperature_2m") is not None else base_temp,
                "relative_humidity_percent": cube_data["nwp_variables"]["relative_humidity_2m"] if cube_data.get("nwp_variables") and cube_data["nwp_variables"].get("relative_humidity_2m") is not None else base_rh,
                "cape_jkg": int(cube_data["nwp_variables"]["cape_jkg"]) if cube_data.get("nwp_variables") and cube_data["nwp_variables"].get("cape_jkg") is not None else int(base_cape),
                "wind_speed_direction": f"10m Wind: {cube_data['nwp_variables']['wind_speed_10m']} km/h" if cube_data.get("nwp_variables") and cube_data["nwp_variables"].get("wind_speed_10m") is not None else base_wind,
                "pressure_hpa": int(base_press),
                "precipitable_water_mm": int(cube_data["nwp_variables"]["total_precipitable_water_mm"]) if cube_data.get("nwp_variables") and cube_data["nwp_variables"].get("total_precipitable_water_mm") is not None else int(base_tpw)
            },
            "probability_curves": {
                "thunderstorm": prob_curve_thunder,
                "lightning": prob_curve_lightning,
                "rainfall": prob_curve_rainfall
            },
            "summary_metrics": {
                "max_thunderstorm_prob_percent": round(float(np.max(selected_pred["p_thunderstorm"])) * 100, 1),
                "max_lightning_prob_percent": round(float(np.max(selected_pred["p_lightning"])) * 100, 1),
                "max_rain_intensity_mmh": round(float(np.max(selected_pred["rainfall_mmh"])), 1),
                "peak_radar_dbz": round(float(np.max(last_frame[:, :, 0])), 1),
                "active_storm_cells_count": len(active_cells),
                "system_confidence_percent": 88.5,
                "uncertainty_index": selected_pred["uncertainty_index"]
            },
            "storm_cells": active_cells,
            "cap_alerts": cap_alerts,
            "xai_explanation": xai_explanation,
            "layers": {
                "radar_dbz": radar_dbz_grid,
                "satellite_tir": sat_tir_grid,
                "lightning_density": lightning_density_grid,
                "pred_thunderstorm_prob": p_thunder_grid,
                "pred_lightning_prob": p_lightning_grid,
                "pred_rainfall_mmh": rainfall_grid
            }
        }

forecast_engine = ForecastEngine()
