"""
ISRO Doppler Weather Radar (DWR) API Client
Connects to ISRO MOSDAC / IMD DWR endpoints to fetch radar volume scan products (Reflectivity & Radial Velocity).

SECURITY MANDATE:
- NEVER hard-code credentials.
- NEVER return synthetic radar observations and label them REAL.
- If credentials or API access are unconfigured, return status=UNAVAILABLE, reason=ISRO_DWR_ACCESS_NOT_CONFIGURED.
"""
import time
import logging
import urllib.request
import urllib.error
import json
import os
from typing import Dict, Any, Optional
from app.config import config
from app.data_sources.imd.status import status_tracker
from app.services.isro_radar.validation import validate_radar_response, validate_radar_coverage
from app.services.isro_radar.parser import parse_radar_volume_scan

logger = logging.getLogger("VAJRA-AI.ISRORadarClient")

# Known radar site metadata
KNOWN_RADAR_SITES = {
    "VISAKHAPATNAM_DWR": {"lat": 17.72, "lon": 83.25, "name": "Visakhapatnam DWR (Coastal AP)"},
    "MACHILIPATNAM_DWR": {"lat": 16.20, "lon": 81.15, "name": "Machilipatnam DWR (Krishna Basin)"},
    "HYDERABAD_DWR": {"lat": 17.38, "lon": 78.48, "name": "Hyderabad DWR (Telangana Hub)"}
}

class ISRORadarClient:
    def __init__(self):
        self.username = os.getenv("ISRO_DWR_USERNAME", "")
        self.password = os.getenv("ISRO_DWR_PASSWORD", "")
        self.api_url = os.getenv("ISRO_DWR_API_URL", "")
        self.radar_id = os.getenv("ISRO_DWR_RADAR_ID", "VISAKHAPATNAM_DWR")
        self.timeout = config.IMD_REQUEST_TIMEOUT_SEC
        self.max_retries = 3

    def is_configured(self) -> bool:
        """
        Checks whether ISRO DWR API access credentials are configured OR local NetCDF radar files exist.
        """
        from app.services.isro_radar.radar_dataset import radar_dataset
        username = os.getenv("ISRO_DWR_USERNAME", self.username)
        password = os.getenv("ISRO_DWR_PASSWORD", self.password)
        api_url = os.getenv("ISRO_DWR_API_URL", self.api_url)
        if bool(username and password and api_url):
            return True

        inventory = radar_dataset.get_radar_inventory()
        return len(inventory) > 0

    def get_status(self) -> Dict[str, Any]:
        """
        Returns structured status summary for ISRO DWR radar ingestion.
        """
        from app.services.isro_radar.radar_dataset import radar_dataset
        inventory = radar_dataset.get_radar_inventory()
        if len(inventory) > 0:
            latest = inventory[-1]
            st = "ARCHIVE" if "2026" in latest["timestamp_iso"] else "REAL"
            site_lat, site_lon = 25.2680, 91.7332
            is_cov, dist_km, cov_desc = validate_radar_coverage(
                site_lat=site_lat,
                site_lon=site_lon,
                max_range_km=240.0,
                target_bounds=config.GRID_BOUNDS
            )
            return {
                "source": "ISRO DWR",
                "radar_site": "Cherrapunji DWR (RSCHR)",
                "site_coordinates": [site_lat, site_lon],
                "status": "OUT_OF_COVERAGE" if not is_cov else "AVAILABLE",
                "reason": cov_desc if not is_cov else None,
                "provenance": st,
                "latest_observation_file": latest["filename"],
                "latest_observation_time": latest["timestamp_iso"],
                "files_count": len(inventory),
                "resolution": "150m-300m range bin polar scan",
                "coverage_valid": is_cov,
                "coverage": cov_desc
            }

        site_info = KNOWN_RADAR_SITES.get(self.radar_id, {"lat": 17.72, "lon": 83.25, "name": self.radar_id})
        is_cov, dist_km, cov_desc = validate_radar_coverage(
            site_lat=site_info["lat"],
            site_lon=site_info["lon"],
            target_bounds=config.GRID_BOUNDS
        )

        if not self.is_configured():
            return {
                "source": "ISRO DWR",
                "radar_site": self.radar_id,
                "site_coordinates": [site_info["lat"], site_info["lon"]],
                "status": "UNAVAILABLE",
                "reason": "ISRO_DWR_ACCESS_NOT_CONFIGURED",
                "provenance": "NONE",
                "resolution": "1 km spatial grid",
                "coverage_valid": is_cov,
                "coverage": cov_desc
            }

        track = status_tracker.get_source_status("radar")
        st = track.get("status", "UNCONFIGURED")
        prov = "REAL" if st in ("AVAILABLE", "REAL", "CONNECTED") else "NONE"

        return {
            "source": "ISRO DWR",
            "radar_site": self.radar_id,
            "site_coordinates": [site_info["lat"], site_info["lon"]],
            "status": "AVAILABLE" if st in ("AVAILABLE", "REAL", "CONNECTED") else "UNAVAILABLE",
            "reason": track.get("error_message") if st not in ("AVAILABLE", "REAL", "CONNECTED") else None,
            "provenance": prov,
            "resolution": "1 km spatial grid",
            "coverage_valid": is_cov,
            "coverage": cov_desc
        }

    def fetch_radar_observations(
        self,
        latitude: float = config.OPEN_METEO_LAT,
        longitude: float = config.OPEN_METEO_LON
    ) -> Dict[str, Any]:
        """
        Retrieves real ISRO DWR radar observations (dBZ reflectivity & radial velocity m/s).
        Prioritizes verified local NetCDF radar files from data directory.
        Performs explicit spatial coverage validation against requested grid bounds.
        """
        from app.services.isro_radar.radar_dataset import radar_dataset
        from app.services.isro_radar.radar_loader import radar_loader
        from app.services.isro_radar.radar_preprocessor import radar_preprocessor

        inventory = radar_dataset.get_radar_inventory()
        if len(inventory) > 0:
            latest = inventory[-1]
            try:
                raw = radar_loader.read_radar_file(latest["filepath"])
                prov = "ARCHIVE" if "2026" in raw["timestamp_iso"] else "REAL"

                # Perform explicit spatial-coverage validation against target grid bounds
                is_cov, dist_km, cov_desc = validate_radar_coverage(
                    site_lat=raw["station_lat"],
                    site_lon=raw["station_lon"],
                    max_range_km=raw.get("max_range_km", 240.0),
                    target_bounds=config.GRID_BOUNDS
                )

                if not is_cov:
                    logger.warning(f"[ISRORadarClient] Radar site {raw['station_name']} ({raw['station_lat']}N, {raw['station_lon']}E) is out of range for target grid bounds: {cov_desc}")
                    status_tracker.update_source(
                        source_key="radar",
                        status="OUT_OF_COVERAGE",
                        latency_ms=15.0,
                        records_count=len(inventory),
                        latest_obs_time=raw["timestamp_iso"],
                        error_message=cov_desc
                    )

                    return {
                        "status": "OUT_OF_COVERAGE",
                        "provenance": prov,
                        "source": "ISRO DWR",
                        "radar_site": raw["station_name"],
                        "coverage_valid": False,
                        "coverage": cov_desc,
                        "data": {
                            "timestamp": raw["timestamp_iso"],
                            "source": "ISRO DWR",
                            "radar_site": raw["station_name"],
                            "filename": latest["filename"],
                            "provenance": prov,
                            "station_lat": raw["station_lat"],
                            "station_lon": raw["station_lon"],
                            "max_dbz": 0.0,
                            "max_vel": 0.0,
                            "dbz_grid": None,
                            "velocity_grid": None
                        },
                        "latency_ms": 15.0
                    }

                grid_res = radar_preprocessor.resample_to_grid(raw, grid_shape=(config.GRID_BOUNDS["grid_rows"], config.GRID_BOUNDS["grid_cols"]))

                status_tracker.update_source(
                    source_key="radar",
                    status="AVAILABLE",
                    latency_ms=15.0,
                    records_count=len(inventory),
                    latest_obs_time=raw["timestamp_iso"]
                )

                return {
                    "status": "AVAILABLE",
                    "provenance": prov,
                    "source": "ISRO DWR",
                    "radar_site": raw["station_name"],
                    "coverage_valid": True,
                    "coverage": cov_desc,
                    "data": {
                        "timestamp": raw["timestamp_iso"],
                        "source": "ISRO DWR",
                        "radar_site": raw["station_name"],
                        "filename": latest["filename"],
                        "provenance": prov,
                        "station_lat": raw["station_lat"],
                        "station_lon": raw["station_lon"],
                        "max_dbz": grid_res["max_dbz"],
                        "max_vel": grid_res["max_vel"],
                        "dbz_grid": grid_res["grid_dbz"],
                        "velocity_grid": grid_res["grid_vel"]
                    },
                    "latency_ms": 15.0
                }
            except Exception as e:
                logger.error(f"Failed to process local NetCDF radar scan {latest['filename']}: {e}")

        api_url = os.getenv("ISRO_DWR_API_URL", self.api_url)
        target_url = f"{api_url}?radar_id={self.radar_id}&lat={latitude}&lon={longitude}"
        headers = {
            "User-Agent": "VAJRA-AI-ISRO-Radar-Connector/1.0",
            "Accept": "application/json"
        }

        username = os.getenv("ISRO_DWR_USERNAME", self.username)
        password = os.getenv("ISRO_DWR_PASSWORD", self.password)
        if username and password:
            import base64
            auth_str = f"{username}:{password}"
            encoded = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
            headers["Authorization"] = f"Basic {encoded}"

        last_error = ""
        attempt = 0
        start_time = time.time()

        while attempt < self.max_retries:
            attempt += 1
            try:
                req = urllib.request.Request(target_url, headers=headers, method="GET")
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    latency = (time.time() - start_time) * 1000.0
                    body = resp.read().decode("utf-8")
                    data_json = json.loads(body)
                    data_json["latency_ms"] = latency
                    data_json["status_code"] = resp.status

                    is_valid, err_msg = validate_radar_response(data_json)
                    if is_valid:
                        parsed = parse_radar_volume_scan(data_json, target_bounds=config.GRID_BOUNDS)
                        prov = parsed.get("provenance", "REAL")
                        status_tracker.update_source(
                            source_key="radar",
                            status="AVAILABLE",
                            latency_ms=latency,
                            records_count=1,
                            latest_obs_time=parsed["timestamp"]
                        )
                        return {
                            "status": "AVAILABLE",
                            "provenance": prov,
                            "source": "ISRO DWR",
                            "radar_site": self.radar_id,
                            "coverage_valid": is_cov,
                            "coverage": parsed.get("coverage", cov_desc),
                            "data": parsed,
                            "latency_ms": latency
                        }
                    else:
                        last_error = f"ISRO Radar payload validation failed: {err_msg}"
            except Exception as e:
                last_error = f"Radar Request Error: {str(e)}"

            time.sleep(0.5)

        latency = (time.time() - start_time) * 1000.0
        status_tracker.update_source(
            source_key="radar",
            status="UNAVAILABLE",
            latency_ms=latency,
            error_message=last_error
        )
        return {
            "status": "UNAVAILABLE",
            "reason": last_error or "ISRO_RADAR_REQUEST_FAILED",
            "provenance": "NONE",
            "source": "ISRO DWR",
            "radar_site": self.radar_id,
            "coverage_valid": is_cov,
            "coverage": cov_desc,
            "data": None
        }

isro_radar_client = ISRORadarClient()
