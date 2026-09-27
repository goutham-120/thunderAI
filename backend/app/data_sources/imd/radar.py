"""
IMD Doppler Weather Radar (DWR) Connector
Ingests, validates, and standardizes Doppler Weather Radar observation products (Reflectivity dBZ, Radial Velocity)
from official IMD DWR radar network endpoints.
Provides spatial resampling/interpolation to the model target grid (64x64).
"""
import logging
import numpy as np
from typing import Dict, Any, Optional
from app.config import config
from app.data_sources.imd.client import imd_client
from app.data_sources.imd.validation import parse_iso_timestamp, safe_float
from app.data_sources.imd.status import status_tracker

logger = logging.getLogger("VAJRA-AI.IMDRadarConnector")

class IMDRadarConnector:
    def __init__(self, api_url: Optional[str] = None):
        self.api_url = api_url if api_url is not None else config.IMD_RADAR_API_URL

    def fetch_radar_data(self) -> Dict[str, Any]:
        """
        Fetches live radar data from IMD DWR endpoint.
        Parses metadata, spatial coordinates, reflectivity data / image references, and site information.
        Does NOT invent dBZ values if response is unconfigured or failed.
        """
        logger.info(f"[IMD] Requesting DWR Radar data from {self.api_url}")
        res = imd_client.get(self.api_url)

        if not res["success"]:
            logger.error(f"[IMD] Radar fetch failed: {res['status']} | {res['error']}")
            status_tracker.update_source(
                source_key="radar",
                status=res["status"],
                latency_ms=res["latency_ms"],
                error_message=res["error"]
            )
            return {
                "success": False,
                "status": res["status"],
                "error": res["error"],
                "latency_ms": res["latency_ms"],
                "radar_product": None
            }

        data_payload = res["data"]
        timestamp = None
        site_id = "HYDERABAD_DWR"
        site_lat = 17.40
        site_lon = 78.48
        grid_data = None
        image_url = None
        units = "dBZ"

        if isinstance(data_payload, dict):
            raw_ts = data_payload.get("timestamp") or data_payload.get("datetime") or data_payload.get("time")
            timestamp = parse_iso_timestamp(raw_ts)
            site_id = data_payload.get("site_id") or data_payload.get("station") or "IMD_DWR"
            site_lat = safe_float(data_payload.get("latitude") or data_payload.get("site_lat")) or site_lat
            site_lon = safe_float(data_payload.get("longitude") or data_payload.get("site_lon")) or site_lon
            image_url = data_payload.get("image_url") or data_payload.get("url")
            units = data_payload.get("units") or "dBZ"

            if "grid" in data_payload and isinstance(data_payload["grid"], list):
                try:
                    grid_data = np.array(data_payload["grid"], dtype=np.float32)
                except Exception as arr_err:
                    logger.warning(f"[IMD] Could not parse radar grid array: {arr_err}")

            elif "base64_image" in data_payload:
                image_url = f"data:image/png;base64,{data_payload['base64_image']}"

        elif isinstance(data_payload, list):
            timestamp = parse_iso_timestamp(None)
            try:
                grid_data = np.array(data_payload, dtype=np.float32)
            except Exception:
                pass

        logger.info(f"[IMD] Radar data ingested from {site_id} | Units: {units} | Has Grid: {grid_data is not None}")
        status_tracker.update_source(
            source_key="radar",
            status="CONNECTED",
            latency_ms=res["latency_ms"],
            records_count=1 if grid_data is not None or image_url else 0,
            latest_obs_time=timestamp
        )

        return {
            "success": True,
            "status": "CONNECTED",
            "source": "IMD",
            "source_type": "RADAR",
            "site_id": site_id,
            "site_lat": site_lat,
            "site_lon": site_lon,
            "timestamp": timestamp,
            "units": units,
            "image_url": image_url,
            "has_raster_grid": grid_data is not None,
            "grid": grid_data,
            "latency_ms": res["latency_ms"]
        }

    def resample_radar_to_grid(
        self,
        radar_result: Dict[str, Any],
        target_rows: int = 64,
        target_cols: int = 64
    ) -> Optional[np.ndarray]:
        """
        Resamples real radar spatial raster data into target grid dimensions [64, 64].
        Returns None if real raster grid is unavailable.
        """
        if not radar_result.get("success") or radar_result.get("grid") is None:
            return None

        raw_grid = radar_result["grid"]
        if not isinstance(raw_grid, np.ndarray) or raw_grid.ndim != 2:
            return None

        # Resize/interpolate to target_rows x target_cols
        r_orig, c_orig = raw_grid.shape
        row_indices = np.linspace(0, r_orig - 1, target_rows).astype(int)
        col_indices = np.linspace(0, c_orig - 1, target_cols).astype(int)
        resampled_dbz = raw_grid[np.ix_(row_indices, col_indices)]
        return np.clip(resampled_dbz, 0.0, 75.0)

radar_connector = IMDRadarConnector()
