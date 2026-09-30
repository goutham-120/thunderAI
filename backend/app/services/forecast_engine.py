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
from app.services.consistency_analyzer import consistency_analyzer
from app.config import config

REGION_COORDINATES = {
    "Telangana": {"center": (18.1124, 79.0193), "speed": 24.0, "heading": 135.0, "intensity": 1.05},
    "Andhra Pradesh": {"center": (15.9129, 79.7400), "speed": 28.0, "heading": 120.0, "intensity": 1.12},
    "Odisha": {"center": (20.9517, 85.0985), "speed": 34.0, "heading": 115.0, "intensity": 1.18},
    "Karnataka": {"center": (15.3173, 75.7139), "speed": 20.0, "heading": 150.0, "intensity": 0.98},
    "Maharashtra": {"center": (19.7515, 75.7139), "speed": 22.0, "heading": 140.0, "intensity": 1.02},
    "West Bengal": {"center": (22.9868, 87.8550), "speed": 32.0, "heading": 110.0, "intensity": 1.15},
    "Delhi": {"center": (28.7041, 77.1025), "speed": 26.0, "heading": 130.0, "intensity": 1.08},
    "Delhi (NCT)": {"center": (28.7041, 77.1025), "speed": 26.0, "heading": 130.0, "intensity": 1.08},
    "Tamil Nadu": {"center": (11.1271, 78.6569), "speed": 18.0, "heading": 160.0, "intensity": 0.94},
    "Gujarat": {"center": (22.2587, 71.1924), "speed": 25.0, "heading": 125.0, "intensity": 1.00},
    "Assam": {"center": (26.2006, 92.9376), "speed": 30.0, "heading": 105.0, "intensity": 1.16},
    "Kerala": {"center": (10.8505, 76.2711), "speed": 16.0, "heading": 170.0, "intensity": 0.92},
    "Rajasthan": {"center": (27.0238, 74.2179), "speed": 28.0, "heading": 135.0, "intensity": 0.90},
    "Uttar Pradesh": {"center": (26.8467, 80.9462), "speed": 25.0, "heading": 120.0, "intensity": 1.06},
    "Bihar": {"center": (25.0961, 85.3131), "speed": 29.0, "heading": 115.0, "intensity": 1.10},
    "Punjab": {"center": (31.1471, 75.3412), "speed": 24.0, "heading": 130.0, "intensity": 0.96},
    "Chhattisgarh": {"center": (21.2787, 81.8661), "speed": 26.0, "heading": 125.0, "intensity": 1.08},
    "Jharkhand": {"center": (23.6102, 85.2799), "speed": 30.0, "heading": 118.0, "intensity": 1.12},
    "Goa": {"center": (15.2993, 74.1240), "speed": 18.0, "heading": 155.0, "intensity": 0.95},
    "Haryana": {"center": (29.0588, 76.0856), "speed": 25.0, "heading": 130.0, "intensity": 0.98},
    "Himachal Pradesh": {"center": (31.1048, 77.1734), "speed": 22.0, "heading": 140.0, "intensity": 0.92},
    "Jammu and Kashmir": {"center": (33.7782, 76.5762), "speed": 20.0, "heading": 145.0, "intensity": 0.88},
    "Ladakh": {"center": (34.1526, 77.5771), "speed": 18.0, "heading": 150.0, "intensity": 0.75},
    "Uttarakhand": {"center": (30.0668, 79.0193), "speed": 24.0, "heading": 135.0, "intensity": 0.95},
    "Meghalaya": {"center": (25.4670, 91.3662), "speed": 32.0, "heading": 105.0, "intensity": 1.20},
    "Nagaland": {"center": (26.1584, 94.5624), "speed": 28.0, "heading": 110.0, "intensity": 1.05},
    "Manipur": {"center": (24.6637, 93.9063), "speed": 26.0, "heading": 115.0, "intensity": 1.02},
    "Mizoram": {"center": (23.1645, 92.9376), "speed": 27.0, "heading": 115.0, "intensity": 1.04},
    "Tripura": {"center": (23.9408, 91.9882), "speed": 28.0, "heading": 112.0, "intensity": 1.08},
    "Sikkim": {"center": (27.5330, 88.5122), "speed": 25.0, "heading": 120.0, "intensity": 0.98},
    "Arunachal Pradesh": {"center": (28.2180, 94.7278), "speed": 26.0, "heading": 110.0, "intensity": 1.02},
    "All India Composite": {"center": (20.5937, 78.9629), "speed": 25.0, "heading": 130.0, "intensity": 1.00},
    "Andhra Pradesh & Telangana": {"center": (17.40, 78.48), "speed": 24.0, "heading": 135.0, "intensity": 1.05},
    "East Coast (Odisha & WB)": {"center": (21.50, 86.50), "speed": 34.0, "heading": 115.0, "intensity": 1.18},
    "South Interior Karnataka": {"center": (13.50, 76.50), "speed": 20.0, "heading": 150.0, "intensity": 0.98}
}

class ForecastEngine:
    def get_complete_nowcast(
        self,
        horizon_min: int = 30,
        event_id: str = "LIVE",
        t_offset_minutes: int = 0,
        data_mode: Optional[str] = None,
        region_name: Optional[str] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        min_lat: Optional[float] = None,
        max_lat: Optional[float] = None,
        min_lon: Optional[float] = None,
        max_lon: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Runs full multimodal pipeline and produces geospatial payload for the UI.
        Supports location and region targeting for dynamic forecasts.
        """
        # Determine center, speed, heading, and intensity based on event or location
        if event_id == "ODISHA-KALBAISAKHI-2024":
            center = (20.30, 85.82)
            speed = 34.0
            heading = 115.0
            intensity = 1.18
            base_temp, base_rh, base_cape, base_press, base_wind, base_tpw = 32.5, 84.0, 2850.0, 1001.0, "SE 24 km/h", 58.0
        elif event_id == "BENGALURU-URBAN-2023":
            center = (12.97, 77.59)
            speed = 18.0
            heading = 160.0
            intensity = 0.95
            base_temp, base_rh, base_cape, base_press, base_wind, base_tpw = 26.5, 72.0, 1450.0, 1012.0, "SW 14 km/h", 44.0
        elif region_name and region_name in REGION_COORDINATES:
            cfg = REGION_COORDINATES[region_name]
            center = cfg["center"]
            speed = cfg["speed"]
            heading = cfg["heading"]
            intensity = cfg["intensity"]
            base_temp, base_rh, base_cape, base_press, base_wind, base_tpw = 29.0, 78.0, 1840.0, 1004.0, "SE 18 km/h", 52.0
        elif min_lat is not None and max_lat is not None and min_lon is not None and max_lon is not None:
            center = ((float(min_lat) + float(max_lat)) / 2.0, (float(min_lon) + float(max_lon)) / 2.0)
            speed = 25.0
            heading = 130.0
            intensity = 1.05
            base_temp, base_rh, base_cape, base_press, base_wind, base_tpw = 28.5, 76.0, 1950.0, 1005.0, "SE 18 km/h", 50.0
        else: # Default LIVE / Telangana
            center = (17.6185, 78.8380)  # Bhongir / Yadagirigutta storm center
            speed = 24.0
            heading = 135.0
            intensity = 1.05
            base_temp, base_rh, base_cape, base_press, base_wind, base_tpw = 29.0, 78.0, 1840.0, 1004.0, "SE 18 km/h", 52.0

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
        raw_cells = storm_tracker.detect_and_track_cells(
            dbz_grid=last_frame[:, :, 0],
            sat_grid=last_frame[:, :, 2],
            lightning_grid=last_frame[:, :, 4],
            cape_grid=last_frame[:, :, 5],
            storm_speed_kmh=speed,
            storm_heading_deg=heading
        )

        # Update active cells position and intensity to the selected forecast horizon
        active_cells = []
        lead_decay = max(0.4, 1.0 - (horizon_min / 240.0))
        for cell in raw_cells:
            cell_copy = dict(cell)
            proj = next((p for p in cell.get("trajectory", []) if p["horizon_min"] == horizon_min), None)
            if proj:
                cell_copy["lat"] = proj["lat"]
                cell_copy["lon"] = proj["lon"]
                cell_copy["uncertainty_radius_km"] = proj.get("uncertainty_radius_km", proj.get("uncertainty_km", 5.0))
            cell_copy["max_dbz"] = round(float(cell.get("max_dbz", 55.0)) * lead_decay, 1)
            cell_copy["vil_kgm2"] = round(float(cell.get("vil_kgm2", 42.0)) * lead_decay, 1)
            cell_copy["echo_top_km"] = round(float(cell.get("echo_top_km", 13.5)) * lead_decay, 1)
            active_cells.append(cell_copy)

        # 4. Generate CAP Emergency Alerts
        cap_alerts = cap_engine.generate_cap_alerts(active_cells)

        # 5. Generate Multi-Horizon Probability Curve for chart
        prob_curve_thunder = []
        prob_curve_lightning = []
        prob_curve_rainfall = []
        forecast_evolution = []

        dbz_frame_0 = last_frame[:, :, 0]
        peak_dbz_val = round(float(np.max(dbz_frame_0)), 1)
        rain_grid_0 = np.where(dbz_frame_0 > 15.0, ((10.0 ** (dbz_frame_0 / 10.0)) / 200.0) ** (1.0 / 1.6), 0.0)
        peak_rain_0 = round(float(np.clip(np.max(rain_grid_0), 0.0, 120.0)), 1)
        peak_lightning_0 = float(np.max(last_frame[:, :, 4]))
        p_t_0 = round(float(np.clip(1.0 / (1.0 + np.exp(-(peak_dbz_val - 35.0) / 7.0)), 0.02, 0.98)), 2)
        p_l_0 = round(float(np.clip(peak_lightning_0 * 0.15 + (0.55 if peak_dbz_val > 38.0 else 0.05), 0.01, 0.96)), 2)


        for h in [0, 15, 30, 45, 60, 90, 120, 180]:
            if h == 0:
                p_t = p_t_0
                p_l = p_l_0
                r_val = peak_rain_0
                h_dbz = peak_dbz_val
            else:
                p_res = pred_dict.get(h, pred_dict[30])
                p_t = round(float(np.max(p_res["p_thunderstorm"])), 2)
                p_l = round(float(np.max(p_res["p_lightning"])), 2)
                r_val = round(float(np.max(p_res["rainfall_mmh"])), 1)
                h_dbz = round(float(np.max(p_res["pred_dbz"])), 1) if "pred_dbz" in p_res else round(max(15.0, peak_dbz_val * (1.0 - h / 350.0)), 1)

            thu_pct = int(p_t * 100)
            lig_pct = int(p_l * 100)

            prob_curve_thunder.append({"time": f"{h}m", "val": thu_pct})
            prob_curve_lightning.append({"time": f"{h}m", "val": lig_pct})
            prob_curve_rainfall.append({"time": f"{h}m", "val": int(r_val)})

            threat_lvl = "CRITICAL" if thu_pct > 70 else "HIGH" if thu_pct > 40 else "MODERATE" if thu_pct > 20 else "LOW"
            forecast_evolution.append({
                "horizon_min": h,
                "label": "NOW" if h == 0 else f"+{h}m",
                "thunderstorm_prob_pct": thu_pct,
                "p_thunderstorm": thu_pct,
                "lightning_prob_pct": lig_pct,
                "p_lightning": lig_pct,
                "rainfall_rate_mmh": r_val,
                "rainfall_mmh": r_val,
                "max_dbz": h_dbz,
                "pred_dbz": h_dbz,
                "threat_level": threat_lvl,
                "status": threat_lvl
            })

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
                lightning_rate=top_cell["lightning_flash_rate_min"] * lead_decay
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
        radar_dbz_grid = np.round(selected_pred["pred_dbz"][::2, ::2], 1).tolist()

        # Advect and decay satellite and lightning density layers for the horizon
        shift_x = int(round((speed / 60.0) * np.sin(np.radians(heading)) * horizon_min))
        shift_y = int(round((speed / 60.0) * np.cos(np.radians(heading)) * horizon_min))
        sat_advected = np.roll(np.roll(last_frame[:, :, 2], shift_y, axis=0), shift_x, axis=1)
        light_advected = np.roll(np.roll(last_frame[:, :, 4], shift_y, axis=0), shift_x, axis=1) * lead_decay
        sat_tir_grid = np.round(sat_advected[::2, ::2], 1).tolist()
        lightning_density_grid = np.round(light_advected[::2, ::2], 2).tolist()

        now_dt = datetime.now(timezone.utc)
        obs_iso = cube_data.get("observation_timestamp") or now_dt.isoformat()
        try:
            obs_dt = datetime.fromisoformat(obs_iso)
        except Exception:
            obs_dt = now_dt
        valid_dt = obs_dt + timedelta(minutes=horizon_min)

        max_thu_pct = round(float(np.max(selected_pred["p_thunderstorm"])) * 100, 1)
        max_lig_pct = round(float(np.max(selected_pred["p_lightning"])) * 100, 1)
        max_rain_val = round(float(np.max(selected_pred["rainfall_mmh"])), 1)
        peak_dbz_val = round(float(np.max(last_frame[:, :, 0])), 1)

        radar_prov = cube_data.get("channel_provenance", {}).get("radar_dbz", "")
        if "OUT_OF_COVERAGE" in radar_prov:
            radar_status = "OUT_OF_COVERAGE"
            radar_cov_valid = False
            radar_msg = "Available radar site (Cherrapunji DWR, 25.27°N, 91.73°E) is out of range for the requested regional grid (Telangana/AP, 17.5°N, 80.5°E)."
        elif "UNAVAILABLE" in radar_prov:
            radar_status = "UNAVAILABLE"
            radar_cov_valid = False
            radar_msg = "Live regional Doppler Weather Radar feed is unconfigured or unavailable."
        elif cube_data.get("data_mode") == "synthetic":
            radar_status = "SYNTHETIC"
            radar_cov_valid = True
            radar_msg = "Synthetic convective radar simulation mode active for testing."
        else:
            radar_status = "REAL"
            radar_cov_valid = True
            radar_msg = f"Valid regional radar telemetry active ({radar_prov})."

        atmospheric_conditions_dict = {
            "temperature_c": cube_data["nwp_variables"]["temperature_2m"] if cube_data.get("nwp_variables") and cube_data["nwp_variables"].get("temperature_2m") is not None else base_temp,
            "relative_humidity_percent": cube_data["nwp_variables"]["relative_humidity_2m"] if cube_data.get("nwp_variables") and cube_data["nwp_variables"].get("relative_humidity_2m") is not None else base_rh,
            "cape_jkg": int(cube_data["nwp_variables"]["cape_jkg"]) if cube_data.get("nwp_variables") and cube_data["nwp_variables"].get("cape_jkg") is not None else int(base_cape),
            "wind_speed_direction": f"10m Wind: {cube_data['nwp_variables']['wind_speed_10m']} km/h" if cube_data.get("nwp_variables") and cube_data["nwp_variables"].get("wind_speed_10m") is not None else base_wind,
            "pressure_hpa": int(base_press),
            "precipitable_water_mm": int(cube_data["nwp_variables"]["total_precipitable_water_mm"]) if cube_data.get("nwp_variables") and cube_data["nwp_variables"].get("total_precipitable_water_mm") is not None else int(base_tpw)
        }

        summary_metrics_dict = {
            "max_thunderstorm_prob_percent": max_thu_pct,
            "max_thunderstorm_prob_pct": max_thu_pct,
            "max_lightning_prob_percent": max_lig_pct,
            "max_lightning_prob_pct": max_lig_pct,
            "max_rain_intensity_mmh": max_rain_val,
            "max_rainfall_rate_mmh": max_rain_val,
            "peak_radar_dbz": peak_dbz_val,
            "max_reflectivity_dbz": peak_dbz_val,
            "active_storm_cells_count": len(active_cells),
            "system_confidence_percent": 88.5,
            "uncertainty_index": selected_pred["uncertainty_index"],
            "radar_status": radar_status,
            "radar_coverage_valid": radar_cov_valid,
            "radar_coverage_message": radar_msg
        }

        timestamps_dict = {
            "observation_time": obs_iso,
            "ingestion_time": cube_data.get("ingestion_timestamp") or now_dt.isoformat(),
            "forecast_generation_time": now_dt.isoformat(),
            "forecast_valid_time": valid_dt.isoformat()
        }

        top_cell = active_cells[0] if active_cells else None
        loc_name = region_name or "Selected Region"

        multi_source_consistency = consistency_analyzer.analyze_consistency(
            summary_metrics=summary_metrics_dict,
            atmospheric_conditions=atmospheric_conditions_dict,
            channel_provenance=cube_data.get("channel_provenance", {}),
            channel_status=cube_data.get("channel_status", {}),
            timestamps=timestamps_dict,
            selected_cell=top_cell,
            selected_location_name=loc_name
        )

        return {
            "status": "success",
            "event_id": event_id,
            "region_name": region_name,
            "center": list(center),
            "data_mode": cube_data.get("data_mode", "synthetic"),
            "data_quality": cube_data.get("data_quality", "SYNTHETIC"),
            "is_valid": cube_data.get("is_valid", True),
            "radar_status": radar_status,
            "radar_coverage_valid": radar_cov_valid,
            "radar_coverage_message": radar_msg,
            "model_status": ai_engine.model_status,
            "inference_mode": ai_engine.inference_mode,
            "model_provenance": ai_engine.get_model_provenance(),
            "horizon_minutes": horizon_min,
            "timestamp": obs_iso,
            "timestamps": timestamps_dict,
            "bounds": cube_data["bounds"],
            "grid_dimensions": {"rows": 32, "cols": 32},
            "channel_provenance": cube_data.get("channel_provenance", {}),
            "channel_status": cube_data.get("channel_status", {}),
            "real_channels": cube_data.get("real_channels", []),
            "fallback_channels": cube_data.get("fallback_channels", []),
            "missing_channels": cube_data.get("missing_channels", []),
            "fallback_used": cube_data.get("fallback_used", False),
            "source_statuses": cube_data.get("source_statuses", {}),
            "atmospheric_conditions": atmospheric_conditions_dict,
            "probability_curves": {
                "thunderstorm": prob_curve_thunder,
                "lightning": prob_curve_lightning,
                "rainfall": prob_curve_rainfall
            },
            "summary_metrics": summary_metrics_dict,
            "multi_source_consistency": multi_source_consistency,
            "forecast_evolution": forecast_evolution,
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

    def analyze_area_nowcast(
        self,
        lat: float = None,
        lon: float = None,
        min_lat: float = None,
        max_lat: float = None,
        min_lon: float = None,
        max_lon: float = None,
        horizon_min: int = 30,
        event_id: str = "LIVE"
    ) -> Dict[str, Any]:
        """
        Area-Based Thunderstorm Nowcasting Engine.
        Analyzes a user-selected point (lat, lon) or bounding area [min_lat, max_lat, min_lon, max_lon]
        against active storm cell trajectories, radar reflectivity grids, and multi-horizon nowcast models.
        """
        full_nowcast = self.get_complete_nowcast(
            horizon_min=horizon_min,
            event_id=event_id,
            lat=lat,
            lon=lon,
            min_lat=min_lat,
            max_lat=max_lat,
            min_lon=min_lon,
            max_lon=max_lon
        )


        # 1. Determine Target Geometry
        is_box = min_lat is not None and max_lat is not None and min_lon is not None and max_lon is not None
        is_point = lat is not None and lon is not None

        if is_box:
            center_lat = (min_lat + max_lat) / 2.0
            center_lon = (min_lon + max_lon) / 2.0
            area_desc = f"Bounding Area [{min_lat:.2f}°N - {max_lat:.2f}°N, {min_lon:.2f}°E - {max_lon:.2f}°E]"
        elif is_point:
            center_lat = lat
            center_lon = lon
            area_desc = f"Selected Coordinates ({lat:.4f}° N, {lon:.4f}° E)"
            min_lat, max_lat = lat - 0.15, lat + 0.15
            min_lon, max_lon = lon - 0.15, lon + 0.15
        else:
            bounds = full_nowcast.get("bounds", [15.0, 76.5, 19.8, 83.5])
            center_lat = (bounds[0] + bounds[2]) / 2.0
            center_lon = (bounds[1] + bounds[3]) / 2.0
            area_desc = f"Grid Center ({center_lat:.4f}° N, {center_lon:.4f}° E)"
            min_lat, max_lat = bounds[0], bounds[2]
            min_lon, max_lon = bounds[1], bounds[3]

        def haversine_km(lat1, lon1, lat2, lon2):
            R = 6371.0
            dlat = np.radians(lat2 - lat1)
            dlon = np.radians(lon2 - lon1)
            a = np.sin(dlat / 2.0)**2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon / 2.0)**2
            return R * 2 * np.arctan2(np.sqrt(a), np.sqrt(1.0 - a))

        storm_cells = full_nowcast.get("storm_cells", [])
        closest_cell = None
        min_distance = 9999.0
        best_arrival_horizon = 0

        for cell in storm_cells:
            c_lat = cell["center"]["lat"]
            c_lon = cell["center"]["lon"]
            d_curr = haversine_km(c_lat, c_lon, center_lat, center_lon)

            trajectory = cell.get("trajectory", [])
            cell_min_d = d_curr
            cell_best_h = 0

            for pt in trajectory:
                d_pt = haversine_km(pt["lat"], pt["lon"], center_lat, center_lon)
                if d_pt < cell_min_d:
                    cell_min_d = d_pt
                    cell_best_h = pt["horizon_min"]

            if cell_min_d < min_distance:
                min_distance = cell_min_d
                closest_cell = cell
                best_arrival_horizon = cell_best_h

        if closest_cell:
            cell_id = closest_cell["cell_id"]
            if min_distance <= 12.0:
                if best_arrival_horizon == 0:
                    status_code = "INTERSECTING_NOW"
                    status_badge = "RED ALERT (DIRECT IMPACT)"
                    badge_color = "red"
                    headline = f"Active Convective Storm {cell_id} currently directly over selected area."
                else:
                    status_code = "APPROACHING"
                    status_badge = "ORANGE WARNING (APPROACHING)"
                    badge_color = "orange"
                    headline = f"Storm Cell {cell_id} predicted to enter selected area at T+{best_arrival_horizon}m."
            elif min_distance <= 35.0:
                status_code = "NEARBY_ACTIVITY"
                status_badge = "YELLOW ADVISORY (NEARBY STORM)"
                badge_color = "yellow"
                headline = f"Convective activity {min_distance:.1f} km from selected region moving {closest_cell['movement']['direction_compass']}."
            else:
                status_code = "CLEAR"
                status_badge = "GREEN (NO IMMEDIATE THREAT)"
                badge_color = "green"
                headline = f"Nearest storm cell ({cell_id}) is {min_distance:.1f} km away. Selected area is clear."
        else:
            status_code = "CLEAR"
            status_badge = "GREEN (CLEAR)"
            badge_color = "green"
            headline = "No active convective storm cells detected in regional grid."

        area_nowcast_timeline = []
        for h in [0, 15, 30, 45, 60, 90, 120, 180]:
            if closest_cell and min_distance <= 40.0:
                decay = max(0.5, 1.0 - (h / 300.0))
                dist_factor = max(0.1, 1.0 - (min_distance / 45.0))
                p_thu = min(98, int((closest_cell["max_dbz"] / 60.0) * 100 * dist_factor * decay))
                p_lig = min(95, int(p_thu * 0.9))
                rain = round(max(0.0, (closest_cell["max_dbz"] - 25.0) * 1.2 * dist_factor * decay), 1)
                dbz = round(max(15.0, closest_cell["max_dbz"] * dist_factor * decay), 1)
            else:
                p_thu = 5
                p_lig = 2
                rain = 0.0
                dbz = 15.0

            threat_badge = "CRITICAL" if p_thu > 70 else "HIGH" if p_thu > 40 else "MODERATE" if p_thu > 20 else "LOW"
            area_nowcast_timeline.append({
                "horizon_min": h,
                "label": "NOW" if h == 0 else f"+{h}m",
                "pred_dbz": dbz,
                "max_dbz": dbz,
                "p_thunderstorm": p_thu,
                "thunderstorm_prob_pct": p_thu,
                "p_lightning": p_lig,
                "lightning_prob_pct": p_lig,
                "rainfall_mmh": rain,
                "rainfall_rate_mmh": rain,
                "threat_level": threat_badge,
                "status": "IMPACT" if p_thu > 70 else "MODERATE" if p_thu > 40 else "CLEAR"
            })


        # 2. Infrastructure Proximity Threat Assessment
        infra_assets = [
            {"id": "INF-HYD-AP", "name": "Rajiv Gandhi Intl Airport (HYD)", "type": "Aviation", "lat": 17.2403, "lon": 78.4294},
            {"id": "INF-HYD-IT", "name": "Cyberabad High-Tech Infrastructure", "type": "Urban Sector", "lat": 17.4435, "lon": 78.3772},
            {"id": "INF-HYD-BEG", "name": "Begumpet Civil Aerodrome", "type": "Aviation", "lat": 17.4531, "lon": 78.4676},
            {"id": "INF-VJA-GRID", "name": "Vijayawada 400kV Substation", "type": "Power Grid", "lat": 16.5062, "lon": 80.6480},
            {"id": "INF-VSKP-PORT", "name": "Visakhapatnam Port Terminal", "type": "Maritime Port", "lat": 17.6868, "lon": 83.2185},
            {"id": "INF-[#BLR]-AP", "name": "Kempegowda Intl Airport (BLR)", "type": "Aviation", "lat": 13.1986, "lon": 77.7066},
            {"id": "INF-BBI-AP", "name": "Bhubaneswar Airport (BBI)", "type": "Aviation", "lat": 20.2444, "lon": 85.8178}
        ]

        infrastructure_threats = []
        if closest_cell:
            for asset in infra_assets:
                d_asset = haversine_km(closest_cell["center"]["lat"], closest_cell["center"]["lon"], asset["lat"], asset["lon"])
                
                # Check trajectory arrival
                best_h_asset = 0
                min_d_traj = d_asset
                for pt in closest_cell.get("trajectory", []):
                    d_pt = haversine_km(pt["lat"], pt["lon"], asset["lat"], asset["lon"])
                    if d_pt < min_d_traj:
                        min_d_traj = d_pt
                        best_h_asset = pt["horizon_min"]

                if min_d_traj <= 45.0:
                    status_str = "DIRECT THREAT" if min_d_traj <= 15.0 else "APPROACHING"
                    infrastructure_threats.append({
                        "id": asset["id"],
                        "name": asset["name"],
                        "type": asset["type"],
                        "distance_km": round(min_d_traj, 1),
                        "eta_minutes": best_h_asset,
                        "threat_level": "CRITICAL" if min_d_traj <= 15.0 else "WARNING",
                        "status": status_str,
                        "closest_cell_id": closest_cell["cell_id"]
                    })

        relevant_alerts = full_nowcast.get("cap_alerts", [])

        area_consistency = consistency_analyzer.analyze_consistency(
            summary_metrics=full_nowcast.get("summary_metrics", {}),
            atmospheric_conditions=full_nowcast.get("atmospheric_conditions", {}),
            channel_provenance=full_nowcast.get("channel_provenance", {}),
            channel_status=full_nowcast.get("channel_status", {}),
            timestamps=full_nowcast.get("timestamps", {}),
            selected_cell=closest_cell,
            selected_location_name=area_desc
        )

        return {
            "status": "success",
            "selected_area": {
                "type": "box" if is_box else "point",
                "center_lat": round(center_lat, 4),
                "center_lon": round(center_lon, 4),
                "bounds": [round(min_lat, 4), round(min_lon, 4), round(max_lat, 4), round(max_lon, 4)],
                "description": area_desc
            },
            "threat_assessment": {
                "status_code": status_code,
                "status_badge": status_badge,
                "badge_color": badge_color,
                "headline": headline,
                "min_distance_km": round(min_distance, 1) if min_distance < 9000 else None,
                "arrival_horizon_min": best_arrival_horizon,
                "closest_cell_id": closest_cell["cell_id"] if closest_cell else None
            },
            "closest_cell": closest_cell,
            "area_nowcast_timeline": area_nowcast_timeline,
            "infrastructure_threats": infrastructure_threats,
            "atmospheric_conditions": full_nowcast.get("atmospheric_conditions", {}),
            "multi_source_consistency": area_consistency,
            "xai_explanation": full_nowcast.get("xai_explanation", {}),
            "cap_alerts": relevant_alerts,
            "data_provenance": {
                "source": "Multimodal Doppler Radar (DWR) + ConvLSTM Model v1.0",
                "timestamp": full_nowcast.get("timestamp"),
                "data_mode": full_nowcast.get("data_mode", "synthetic")
            }
        }

forecast_engine = ForecastEngine()

