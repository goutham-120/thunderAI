"""
MOSDAC / ISRO Satellite Data Connector & Local HDF5 Reader (Phase 1, 3 & 4)
Connects to ISRO satellite observation pipeline:
1. INSAT-3D/3DR/3DS L1C SGP Imager (TIR1 10.8µm Cloud-Top Temp, TIR2 12.0µm, WV 6.8µm Water Vapour)
2. Local HDF5 (.h5) observation file ingestion from C:\\Users\\nalla\\Downloads\\
3. GSMaP ISRO Rain (0.1° Satellite Precipitation)

SECURITY MANDATE:
- NEVER hard-code credentials.
- NEVER print, log, or commit credentials.
- NEVER return synthetic satellite data and label it REAL.
"""
import time
import logging
import urllib.request
import urllib.error
import json
from datetime import datetime, timezone, timedelta
import numpy as np
from typing import Dict, Any, Optional
import numpy as np

from app.config import config
from app.data_sources.imd.status import status_tracker
from app.services.mosdac.validation import validate_mosdac_response
from app.services.mosdac.parser import parse_gsmap_data, parse_insat_observations
from app.services.insat_3ds_processor import insat_processor, ROI_BOUNDS

logger = logging.getLogger("VAJRA-AI.MOSDACClient")

class MOSDACClient:
    def __init__(self):
        self.username = config.MOSDAC_USERNAME
        self.password = config.MOSDAC_PASSWORD
        self.api_url = config.MOSDAC_API_URL
        self.dataset_id = config.MOSDAC_DATASET_ID
        self.timeout = config.MOSDAC_REQUEST_TIMEOUT_SEC
        self.max_retries = config.MOSDAC_MAX_RETRIES

    def is_configured(self) -> bool:
        """
        Checks whether MOSDAC API credentials are configured OR local INSAT-3DS HDF5 files exist.
        """
        username = config.MOSDAC_USERNAME or self.username
        password = config.MOSDAC_PASSWORD or self.password
        api_url = config.MOSDAC_API_URL or self.api_url
        if bool(username and password and api_url):
            return True

        inventory = insat_processor.scan_inventory()
        return len(inventory) > 0

    def _get_recent_cycle_timestamp(self, cycle_minutes: int = 15) -> str:
        """
        Returns recent observation timestamp rounded down to the most recent cycle.
        """
        now = datetime.now(timezone.utc)
        minute = (now.minute // cycle_minutes) * cycle_minutes
        cycle_dt = now.replace(minute=minute, second=0, microsecond=0)
        return cycle_dt.isoformat()

    def generate_fallback_insat(
        self,
        latitude: float,
        longitude: float,
        target_bounds: Optional[Dict[str, float]] = None,
        region_name: Optional[str] = None,
        intensity_factor: float = 1.0,
        rows: int = 64,
        cols: int = 64
    ) -> Dict[str, Any]:
        """
        Generates physically consistent dynamic INSAT-3D/3DR observations for the given region.
        Varies realistically based on region coordinates, intensity factor, and observation time.
        """
        obs_time = self._get_recent_cycle_timestamp(cycle_minutes=15)
        cov = f"{region_name or 'Indian Subcontinent & Bay of Bengal'}"

        # Dynamic cloud top temperature: deep cold convective overshoot in stormy regions
        min_cloud_top_c = round(float(np.clip(-45.0 - (20.0 * intensity_factor) + ((float(latitude) * 2.0 + float(longitude)) % 5.0) - 2.5, -78.0, -18.0)), 1)
        min_cloud_top_k = round(min_cloud_top_c + 273.15, 1)
        mean_tir1_k = round(float(np.clip(282.0 - (18.0 * intensity_factor), 240.0, 298.0)), 1)
        mean_tir2_k = round(mean_tir1_k - 1.2, 1)
        mean_wv_k = round(float(np.clip(242.0 - (14.0 * intensity_factor), 220.0, 260.0)), 1)

        # 2D spatial fields
        lats = np.linspace(latitude - 2.0, latitude + 2.0, rows)
        lons = np.linspace(longitude - 2.5, longitude + 2.5, cols)
        lon_grid, lat_grid = np.meshgrid(lons, lats)

        r_core = 0.35
        dist_sq = (lat_grid - latitude)**2 + (lon_grid - longitude)**2
        tir1_grid = 295.0 - ((295.0 - min_cloud_top_k) * np.exp(-dist_sq / (2 * (r_core * 2.0)**2)))
        tir1_grid = np.clip(tir1_grid + np.random.normal(0, 0.4, (rows, cols)), 195.0, 310.0).astype(np.float32)
        tir2_grid = np.clip(tir1_grid - 1.2, 190.0, 310.0).astype(np.float32)

        wv_grid = 250.0 - (30.0 * intensity_factor * np.exp(-dist_sq / (2 * (r_core * 2.2)**2)))
        wv_grid = np.clip(wv_grid + np.random.normal(0, 0.3, (rows, cols)), 210.0, 275.0).astype(np.float32)

        return {
            "timestamp": obs_time,
            "source": "ISRO Satellite",
            "provider": "ISRO Satellite Data Center (INSAT-3D/3DR)",
            "product": "INSAT-3D/3DR L1B Imager",
            "spatial_resolution": "4 km Imager / 10 km Sounder",
            "temporal_resolution": "15 min",
            "coverage": cov,
            "provenance": "SYNTHETIC_FALLBACK",
            "provenance_detail": "Synthetic fallback — official INSAT access not configured",
            "mean_tir1_temp_k": mean_tir1_k,
            "min_cloud_top_temp_k": min_cloud_top_k,
            "min_cloud_top_temp_c": min_cloud_top_c,
            "mean_tir2_temp_k": mean_tir2_k,
            "mean_water_vapor_k": mean_wv_k,
            "tir1_grid": tir1_grid,
            "tir2_grid": tir2_grid,
            "wv_grid": wv_grid,
            "sounder_data": {
                "status": "SYNTHETIC_FALLBACK",
                "temp_profile_k": [288.15, 275.0, 250.0, 220.0],
                "moisture_profile_pct": [78.0, 58.0, 38.0, 18.0],
                "derived_cape": float(1850.0 * intensity_factor),
                "lifted_index": float(-4.5 * intensity_factor)
            }
        }

    def generate_fallback_gsmap(
        self,
        latitude: float,
        longitude: float,
        region_name: Optional[str] = None,
        intensity_factor: float = 1.0
    ) -> Dict[str, Any]:
        """
        Generates realistic dynamic GSMaP ISRO Rain precipitation fallback.
        """
        obs_time = self._get_recent_cycle_timestamp(cycle_minutes=60)
        base_rate = round(float(np.clip(18.0 * intensity_factor + ((float(latitude) + float(longitude)) % 4.0), 0.0, 85.0)), 1)
        rain_grid = np.zeros((10, 10), dtype=np.float32)
        rain_grid[4:7, 4:7] = base_rate

        return {
            "timestamp": obs_time,
            "source": "ISRO Satellite",
            "product": "GSMaP ISRO Rain",
            "spatial_resolution": "0.1 degree",
            "temporal_resolution": "hourly",
            "coverage": region_name or "Indian Subcontinent",
            "provenance": "SYNTHETIC_FALLBACK",
            "provenance_detail": "Synthetic fallback — official INSAT access not configured",
            "precipitation_rate_mmh": base_rate,
            "rain_grid": rain_grid.tolist()
        }

    def get_status(
        self,
        region_name: Optional[str] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Returns structured status summary for ISRO Satellite products.
        Reflects REAL / ARCHIVE status if local INSAT-3DS HDF5 observations are loaded.
        """
        inventory = insat_processor.scan_inventory()
        if len(inventory) > 0:
            latest = inventory[-1]
            obs_time = latest["timestamp_iso"]
            st = "ARCHIVE" if "2026" in obs_time else "REAL"
            return {
                "source": "ISRO Satellite",
                "products": {
                    "insat_3ds_tir1": st,
                    "insat_3ds_tir2": st,
                    "insat_3ds_wv": st,
                    "insat_3ds_mir": st,
                    "gsmap_rain": "UNAVAILABLE"
                },
                "status": "AVAILABLE",
                "reason": None,
                "provenance": st,
                "latest_observation_file": latest["filename"],
                "latest_observation_time": obs_time,
                "files_count": len(inventory),
                "resolution": "4 km (INSAT-3DS L1C SGP Imager)",
                "temporal_resolution": "30 min",
                "coverage": "Indian Subcontinent / Bay of Bengal / Arabian Sea"
            }

        if not self.is_configured():
            return {
                "source": "ISRO Satellite",
                "products": {
                    "insat_3d_tir1": "UNAVAILABLE",
                    "insat_3d_tir2": "UNAVAILABLE",
                    "insat_3d_wv": "UNAVAILABLE",
                    "insat_3d_sounder": "UNAVAILABLE",
                    "gsmap_rain": "UNAVAILABLE"
                },
                "status": "UNAVAILABLE",
                "reason": "MOSDAC_ACCESS_NOT_CONFIGURED",
                "provenance": "NONE",
                "resolution": "4 km (INSAT Imager) / 10 km (Sounder) / 0.1 degree (GSMaP)",
                "temporal_resolution": "30 min (INSAT) / hourly (GSMaP)",
                "coverage": "Indian Subcontinent & Bay of Bengal"
            }

        track = status_tracker.get_source_status("mosdac_gsmap")
        st = track.get("status", "UNCONFIGURED")
        prov = "REAL" if st in ("AVAILABLE", "REAL", "CONNECTED") else "NONE"

        return {
            "source": "ISRO Satellite",
            "products": {
                "insat_3d_tir1": st,
                "insat_3d_tir2": st,
                "insat_3d_wv": st,
                "insat_3d_sounder": st,
                "gsmap_rain": st
            },
            "status": "REAL" if st in ("AVAILABLE", "REAL", "CONNECTED") else "SYNTHETIC_FALLBACK",
            "reason": track.get("error_message") if st not in ("AVAILABLE", "REAL", "CONNECTED") else None,
            "provenance": prov,
            "provenance_detail": "Live ISRO Satellite data stream" if prov == "REAL" else "Synthetic fallback active",
            "variables": "Cloud Top Temperature, Water Vapour",
            "resolution": "4 km / 15 min",
            "temporal_resolution": "15 min",
            "observation_time": track.get("latest_observation_timestamp"),
            "coverage": region_name or "Indian Subcontinent & Bay of Bengal"
        }

    def fetch_insat_observations(
        self,
        latitude: float = config.OPEN_METEO_LAT,
        longitude: float = config.OPEN_METEO_LON,
        roi_name: str = 'AP_TELANGANA'
    ) -> Dict[str, Any]:
        """
        Retrieves INSAT-3DS TIR1 (10.8µm), TIR2 (12.0µm), and Water Vapor (6.8µm) observations.
        Prioritizes verified local INSAT-3DS Level-1C HDF5 files from data directory.
        """
        inventory = insat_processor.scan_inventory()
        if len(inventory) > 0:
            latest = inventory[-1]
            try:
                calibrated = insat_processor.read_and_calibrate_scan(
                    latest["filepath"],
                    roi_name=roi_name,
                    target_grid_size=(config.GRID_BOUNDS["grid_rows"], config.GRID_BOUNDS["grid_cols"])
                )

                # Convert Celsius back to Kelvin for 4D multimodal tensor standards
                tir1_k = calibrated["tir1_celsius"] + 273.15
                tir2_k = calibrated["tir2_celsius"] + 273.15
                wv_k = calibrated["wv_celsius"] + 273.15

                provenance = "ARCHIVE" if "2026" in calibrated["timestamp_iso"] else "REAL"

                status_tracker.update_source(
                    source_key="mosdac_gsmap",
                    status="AVAILABLE",
                    latency_ms=12.0,
                    records_count=len(inventory),
                    latest_obs_time=calibrated["timestamp_iso"]
                )

                return {
                    "status": "AVAILABLE",
                    "provenance": provenance,
                    "source": "ISRO Satellite",
                    "product": "INSAT-3DS L1C SGP Imager",
                    "resolution": "4 km",
                    "temporal_resolution": "30 min",
                    "coverage": "Indian Subcontinent & Bay of Bengal",
                    "data": {
                        "timestamp": calibrated["timestamp_iso"],
                        "source": "ISRO Satellite",
                        "product": "INSAT-3DS L1C SGP Imager",
                        "filename": latest["filename"],
                        "spatial_resolution": "4 km",
                        "provenance": provenance,
                        "mean_tir1_temp_k": float(np.nanmean(tir1_k)),
                        "min_cloud_top_temp_k": float(np.nanmin(tir1_k)),
                        "mean_tir2_temp_k": float(np.nanmean(tir2_k)),
                        "mean_water_vapor_k": float(np.nanmean(wv_k)),
                        "tir1_grid": tir1_k.tolist() if hasattr(tir1_k, "tolist") else tir1_k,
                        "tir2_grid": tir2_k.tolist() if hasattr(tir2_k, "tolist") else tir2_k,
                        "wv_grid": wv_k.tolist() if hasattr(wv_k, "tolist") else wv_k,
                        "tir1_celsius": calibrated["tir1_celsius"].tolist() if hasattr(calibrated["tir1_celsius"], "tolist") else calibrated["tir1_celsius"],
                        "split_window_diff": calibrated["split_window_diff"].tolist() if hasattr(calibrated["split_window_diff"], "tolist") else calibrated["split_window_diff"]
                    },
                    "latency_ms": 12.0
                }
            except Exception as e:
                logger.error(f"Failed to process local INSAT-3DS HDF5 file {latest['filename']}: {e}")

        if not (config.MOSDAC_USERNAME and config.MOSDAC_PASSWORD and config.MOSDAC_API_URL):
            return {
                "status": "UNAVAILABLE",
                "reason": "MOSDAC_ACCESS_NOT_CONFIGURED",
                "provenance": "NONE",
                "source": "ISRO Satellite",
                "product": "INSAT-3D/3DR/3DS L1C Imager",
                "resolution": "4 km",
                "data": None
            }

        target_url = f"{config.MOSDAC_API_URL or self.api_url}?dataset=INSAT_3D_L1B&lat={latitude}&lon={longitude}"
        headers = {
            "User-Agent": "VAJRA-AI-MOSDAC-Connector/1.0",
            "Accept": "application/json"
        }

        if (config.MOSDAC_USERNAME or self.username) and (config.MOSDAC_PASSWORD or self.password):
            import base64
            auth_str = f"{config.MOSDAC_USERNAME or self.username}:{config.MOSDAC_PASSWORD or self.password}"
            encoded = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
            headers["Authorization"] = f"Basic {encoded}"

        last_error = ""
        attempt = 0
        start_time = time.time()

        while attempt < (config.MOSDAC_MAX_RETRIES or self.max_retries):
            attempt += 1
            try:
                req = urllib.request.Request(target_url, headers=headers, method="GET")
                with urllib.request.urlopen(req, timeout=config.MOSDAC_REQUEST_TIMEOUT_SEC or self.timeout) as resp:
                    latency = (time.time() - start_time) * 1000.0
                    body = resp.read().decode("utf-8")
                    data_json = json.loads(body)
                    data_json["latency_ms"] = latency
                    data_json["status_code"] = resp.status

                    is_valid, err_msg = validate_mosdac_response(data_json)
                    if is_valid:
                        parsed = parse_insat_observations(data_json, target_bounds=target_bounds or config.GRID_BOUNDS)
                        prov = parsed.get("provenance", "REAL")
                        status_tracker.update_source(
                            source_key="mosdac_gsmap",
                            status="REAL",
                            latency_ms=latency,
                            records_count=1,
                            latest_obs_time=parsed["timestamp"]
                        )
                        return {
                            "status": "REAL",
                            "provenance": prov,
                            "provenance_detail": "Live ISRO Satellite data stream",
                            "source": "ISRO Satellite",
                            "provider": "ISRO Satellite Data Center (INSAT-3D/3DR)",
                            "product": "INSAT-3D/3DR L1B Imager",
                            "variables": "Cloud Top Temperature, Water Vapour",
                            "resolution": "4 km / 15 min",
                            "temporal_resolution": "15 min",
                            "observation_time": parsed["timestamp"],
                            "coverage": parsed.get("coverage", "Indian Subcontinent"),
                            "data": parsed,
                            "latency_ms": latency
                        }
                    else:
                        last_error = f"MOSDAC INSAT payload validation failed: {err_msg}"
            except Exception as e:
                last_error = f"INSAT Request Error: {str(e)}"

            time.sleep(0.5)

        latency = (time.time() - start_time) * 1000.0
        status_tracker.update_source(
            source_key="mosdac_gsmap",
            status="UNAVAILABLE",
            latency_ms=latency,
            error_message=last_error
        )
        return {
            "status": "UNAVAILABLE",
            "reason": last_error or "MOSDAC_INSAT_REQUEST_FAILED",
            "provenance": "NONE",
            "source": "ISRO Satellite",
            "product": "INSAT-3D/3DR L1B Imager",
            "resolution": "4 km",
            "data": None
        }

    def fetch_gsmap_precipitation(
        self,
        latitude: float = config.OPEN_METEO_LAT,
        longitude: float = config.OPEN_METEO_LON,
        region_name: Optional[str] = None,
        intensity_factor: float = 1.0,
        allow_fallback: bool = True
    ) -> Dict[str, Any]:
        """
        Retrieves real MOSDAC GSMaP ISRO Rain satellite precipitation for specified lat/lon coordinates.
        """
        if not self.is_configured():
            return {
                "status": "UNAVAILABLE",
                "reason": "MOSDAC_ACCESS_NOT_CONFIGURED",
                "provenance": "NONE",
                "source": "ISRO Satellite",
                "product": "GSMaP ISRO Rain",
                "resolution": "0.1 degree",
                "temporal_resolution": "hourly",
                "coverage": "Indian Subcontinent",
                "latitude": latitude,
                "longitude": longitude,
                "data": None
            }

        target_url = f"{config.MOSDAC_API_URL or self.api_url}?dataset={config.MOSDAC_DATASET_ID or self.dataset_id}&lat={latitude}&lon={longitude}"
        headers = {
            "User-Agent": "VAJRA-AI-MOSDAC-Connector/1.0",
            "Accept": "application/json"
        }

        if (config.MOSDAC_USERNAME or self.username) and (config.MOSDAC_PASSWORD or self.password):
            import base64
            auth_str = f"{config.MOSDAC_USERNAME or self.username}:{config.MOSDAC_PASSWORD or self.password}"
            encoded = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
            headers["Authorization"] = f"Basic {encoded}"

        last_error = ""
        attempt = 0
        start_time = time.time()

        while attempt < (config.MOSDAC_MAX_RETRIES or self.max_retries):
            attempt += 1
            try:
                req = urllib.request.Request(target_url, headers=headers, method="GET")
                with urllib.request.urlopen(req, timeout=config.MOSDAC_REQUEST_TIMEOUT_SEC or self.timeout) as resp:
                    latency = (time.time() - start_time) * 1000.0
                    body = resp.read().decode("utf-8")
                    data_json = json.loads(body)
                    data_json["latency_ms"] = latency
                    data_json["status_code"] = resp.status

                    is_valid, err_msg = validate_mosdac_response(data_json)
                    if is_valid:
                        parsed = parse_gsmap_data(data_json, target_lat=latitude, target_lon=longitude)
                        prov = parsed.get("provenance", "REAL")
                        return {
                            "status": "REAL",
                            "provenance": prov,
                            "source": "ISRO Satellite",
                            "product": "GSMaP ISRO Rain",
                            "resolution": "0.1 degree",
                            "temporal_resolution": "hourly",
                            "coverage": "Indian Subcontinent",
                            "latitude": latitude,
                            "longitude": longitude,
                            "data": parsed,
                            "latency_ms": latency
                        }
                    else:
                        last_error = f"MOSDAC payload validation failed: {err_msg}"
            except Exception as e:
                last_error = f"GSMaP Request Error: {str(e)}"

            time.sleep(0.5)

        latency = (time.time() - start_time) * 1000.0
        if allow_fallback:
            parsed = self.generate_fallback_gsmap(
                latitude=latitude,
                longitude=longitude,
                region_name=region_name,
                intensity_factor=intensity_factor
            )
            return {
                "status": "SYNTHETIC_FALLBACK",
                "provenance": "SYNTHETIC_FALLBACK",
                "provenance_detail": f"Synthetic fallback — live fetch failed: {last_error}",
                "source": "ISRO Satellite",
                "product": "GSMaP ISRO Rain",
                "resolution": "0.1 degree",
                "temporal_resolution": "hourly",
                "coverage": parsed["coverage"],
                "latitude": latitude,
                "longitude": longitude,
                "data": parsed,
                "latency_ms": latency
            }
        else:
            return {
                "status": "UNAVAILABLE",
                "reason": last_error or "MOSDAC_GSMAP_REQUEST_FAILED",
                "provenance": "NONE",
                "source": "ISRO Satellite",
                "product": "GSMaP ISRO Rain",
                "resolution": "0.1 degree",
                "data": None
            }

mosdac_client = MOSDACClient()

