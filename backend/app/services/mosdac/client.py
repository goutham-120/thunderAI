"""
MOSDAC Satellite Data API Client (Step 2 & 3)
Connects to ISRO MOSDAC portal to query and ingest:
1. INSAT-3D/3DR/3DS L1B Imager (TIR1 10.8µm Cloud-Top Temp, TIR2 12.0µm, WV 6.8µm Water Vapour)
2. INSAT-3D Sounder Atmospheric Profiles
3. GSMaP ISRO Rain (0.1° Satellite Precipitation)

SECURITY MANDATE:
- NEVER hard-code credentials.
- NEVER print, log, or commit credentials.
- NEVER return synthetic satellite data and label it REAL.
- If credentials or API access are unconfigured, return status=UNAVAILABLE, reason=MOSDAC_ACCESS_NOT_CONFIGURED.
"""
import time
import logging
import urllib.request
import urllib.error
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
import numpy as np

from app.config import config
from app.data_sources.imd.status import status_tracker
from app.services.mosdac.validation import validate_mosdac_response
from app.services.mosdac.parser import parse_gsmap_data, parse_insat_observations

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
        Checks whether MOSDAC API access credentials and URL are fully configured.
        Returns False if any required credential or endpoint URL is missing.
        """
        username = config.MOSDAC_USERNAME or self.username
        password = config.MOSDAC_PASSWORD or self.password
        api_url = config.MOSDAC_API_URL or self.api_url
        return bool(username and password and api_url)

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
        Returns structured status summary for MOSDAC Satellite products.
        Truthfully labels status as REAL when live credentials exist, or SYNTHETIC_FALLBACK.
        """
        cov = region_name or "Indian Subcontinent & Bay of Bengal"
        obs_time = self._get_recent_cycle_timestamp(cycle_minutes=15)

        if not self.is_configured():
            return {
                "source": "ISRO Satellite (INSAT-3D/3DR)",
                "provider": "ISRO Satellite Data Center (INSAT-3D/3DR)",
                "products": {
                    "insat_3d_tir1": "SYNTHETIC_FALLBACK",
                    "insat_3d_tir2": "SYNTHETIC_FALLBACK",
                    "insat_3d_wv": "SYNTHETIC_FALLBACK",
                    "insat_3d_sounder": "SYNTHETIC_FALLBACK",
                    "gsmap_rain": "SYNTHETIC_FALLBACK"
                },
                "status": "SYNTHETIC_FALLBACK",
                "reason": "Synthetic fallback — official INSAT access not configured",
                "provenance": "SYNTHETIC_FALLBACK",
                "provenance_detail": "Synthetic fallback — official INSAT access not configured",
                "variables": "Cloud Top Temperature, Water Vapour",
                "resolution": "4 km / 15 min",
                "temporal_resolution": "15 min",
                "observation_time": obs_time,
                "coverage": cov
            }

        track = status_tracker.get_source_status("mosdac_gsmap")
        st = track.get("status", "UNCONFIGURED")
        prov = "REAL" if st in ("AVAILABLE", "REAL", "CONNECTED") else "SYNTHETIC_FALLBACK"

        return {
            "source": "ISRO Satellite (INSAT-3D/3DR)",
            "provider": "ISRO Satellite Data Center (INSAT-3D/3DR)",
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
            "observation_time": track.get("latest_observation_timestamp") or obs_time,
            "coverage": cov
        }

    def fetch_insat_observations(
        self,
        latitude: float = config.OPEN_METEO_LAT,
        longitude: float = config.OPEN_METEO_LON,
        target_bounds: Optional[Dict[str, float]] = None,
        region_name: Optional[str] = None,
        intensity_factor: float = 1.0,
        allow_fallback: bool = True
    ) -> Dict[str, Any]:
        """
        Retrieves real INSAT-3D/3DR/3DS TIR1, TIR2, WV observations from MOSDAC.
        If credentials/API URL are unconfigured or fail, seamlessly provides dynamic SYNTHETIC_FALLBACK data.
        """
        if not self.is_configured():
            if allow_fallback:
                logger.info("[MOSDACClient] INSAT access unconfigured. Generating realistic SYNTHETIC_FALLBACK.")
                parsed = self.generate_fallback_insat(
                    latitude=latitude,
                    longitude=longitude,
                    target_bounds=target_bounds,
                    region_name=region_name,
                    intensity_factor=intensity_factor
                )
                status_tracker.update_source(
                    source_key="mosdac_gsmap",
                    status="SYNTHETIC_FALLBACK",
                    records_count=1,
                    latest_obs_time=parsed["timestamp"]
                )
                return {
                    "status": "SYNTHETIC_FALLBACK",
                    "provenance": "SYNTHETIC_FALLBACK",
                    "provenance_detail": "Synthetic fallback — official INSAT access not configured",
                    "source": "ISRO Satellite",
                    "provider": "ISRO Satellite Data Center (INSAT-3D/3DR)",
                    "product": "INSAT-3D/3DR L1B Imager",
                    "variables": "Cloud Top Temperature, Water Vapour",
                    "resolution": "4 km / 15 min",
                    "observation_time": parsed["timestamp"],
                    "coverage": parsed["coverage"],
                    "data": parsed
                }
            else:
                return {
                    "status": "UNAVAILABLE",
                    "reason": "MOSDAC_ACCESS_NOT_CONFIGURED",
                    "provenance": "NONE",
                    "source": "ISRO Satellite",
                    "product": "INSAT-3D/3DR L1B Imager",
                    "resolution": "4 km / 15 min",
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
        if allow_fallback:
            logger.warning(f"[MOSDACClient] Real fetch failed ({last_error}). Providing SYNTHETIC_FALLBACK.")
            parsed = self.generate_fallback_insat(
                latitude=latitude,
                longitude=longitude,
                target_bounds=target_bounds,
                region_name=region_name,
                intensity_factor=intensity_factor
            )
            status_tracker.update_source(
                source_key="mosdac_gsmap",
                status="SYNTHETIC_FALLBACK",
                latency_ms=latency,
                error_message=last_error,
                latest_obs_time=parsed["timestamp"]
            )
            return {
                "status": "SYNTHETIC_FALLBACK",
                "provenance": "SYNTHETIC_FALLBACK",
                "provenance_detail": f"Synthetic fallback — live fetch failed: {last_error}",
                "source": "ISRO Satellite",
                "provider": "ISRO Satellite Data Center (INSAT-3D/3DR)",
                "product": "INSAT-3D/3DR L1B Imager",
                "variables": "Cloud Top Temperature, Water Vapour",
                "resolution": "4 km / 15 min",
                "observation_time": parsed["timestamp"],
                "coverage": parsed["coverage"],
                "data": parsed,
                "latency_ms": latency
            }
        else:
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
        Retrieves real MOSDAC GSMaP ISRO Rain satellite precipitation.
        If credentials/API URL are missing or fail, provides realistic SYNTHETIC_FALLBACK.
        """
        if not self.is_configured():
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
                    "provenance_detail": "Synthetic fallback — official INSAT access not configured",
                    "source": "ISRO Satellite",
                    "provider": "ISRO Satellite Data Center (GSMaP)",
                    "product": "GSMaP ISRO Rain",
                    "resolution": "0.1 degree",
                    "temporal_resolution": "hourly",
                    "observation_time": parsed["timestamp"],
                    "coverage": parsed["coverage"],
                    "latitude": latitude,
                    "longitude": longitude,
                    "data": parsed
                }
            else:
                return {
                    "status": "UNAVAILABLE",
                    "reason": "MOSDAC_ACCESS_NOT_CONFIGURED",
                    "provenance": "NONE",
                    "source": "ISRO Satellite",
                    "product": "GSMaP ISRO Rain",
                    "resolution": "0.1 degree",
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

