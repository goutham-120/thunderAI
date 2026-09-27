"""
IMD Lightning Detection Network Connector
Ingests, validates, and normalizes lightning strike detection events from IMD / IITM Damini Lightning Sensors.
Provides spatial point-to-density raster binning for model Channel 4 (Lightning Flash Density).
"""
import logging
import numpy as np
from typing import Dict, Any, List, Optional
from app.config import config
from app.data_sources.imd.client import imd_client
from app.data_sources.imd.validation import validate_coordinates, parse_iso_timestamp, safe_float
from app.data_sources.imd.status import status_tracker

logger = logging.getLogger("VAJRA-AI.IMDLightningConnector")

class IMDLightningConnector:
    def __init__(self, api_url: Optional[str] = None):
        self.api_url = api_url if api_url is not None else config.IMD_LIGHTNING_API_URL

    def fetch_lightning_strikes(self) -> Dict[str, Any]:
        """
        Fetches live lightning strike events from official IMD lightning detection endpoint.
        Normalizes strike observations (lat, lon, timestamp, intensity, polarity).
        Does NOT fabricate lightning strikes when API is unavailable.
        """
        logger.info(f"[IMD] Requesting Lightning strike observations from {self.api_url}")
        res = imd_client.get(self.api_url)

        if not res["success"]:
            logger.error(f"[IMD] Lightning fetch failed: {res['status']} | {res['error']}")
            status_tracker.update_source(
                source_key="lightning",
                status=res["status"],
                latency_ms=res["latency_ms"],
                error_message=res["error"]
            )
            return {
                "success": False,
                "status": res["status"],
                "error": res["error"],
                "latency_ms": res["latency_ms"],
                "strikes": []
            }

        data_payload = res["data"]
        raw_list = []

        if isinstance(data_payload, list):
            raw_list = data_payload
        elif isinstance(data_payload, dict):
            if "strikes" in data_payload and isinstance(data_payload["strikes"], list):
                raw_list = data_payload["strikes"]
            elif "flashes" in data_payload and isinstance(data_payload["flashes"], list):
                raw_list = data_payload["flashes"]
            elif "data" in data_payload and isinstance(data_payload["data"], list):
                raw_list = data_payload["data"]
            else:
                raw_list = list(data_payload.values()) if all(isinstance(v, dict) for v in data_payload.values()) else [data_payload]

        normalized_strikes: List[Dict[str, Any]] = []
        latest_ts = None

        for item in raw_list:
            if not isinstance(item, dict):
                continue

            lat = item.get("latitude") or item.get("lat") or item.get("LAT")
            lon = item.get("longitude") or item.get("lon") or item.get("LON") or item.get("lng")

            if not validate_coordinates(lat, lon):
                continue

            f_lat = float(lat)
            f_lon = float(lon)
            raw_ts = item.get("timestamp") or item.get("time") or item.get("datetime")
            parsed_ts = parse_iso_timestamp(raw_ts)

            if parsed_ts and (latest_ts is None or parsed_ts > latest_ts):
                latest_ts = parsed_ts

            intensity = safe_float(item.get("intensity") or item.get("peak_current") or item.get("current_ka"), min_val=-500.0, max_val=500.0)
            polarity = item.get("polarity")
            if polarity is not None:
                try:
                    polarity = int(polarity)
                except Exception:
                    polarity = None

            strike = {
                "source": "IMD",
                "source_type": "LIGHTNING",
                "timestamp": parsed_ts,
                "latitude": round(f_lat, 4),
                "longitude": round(f_lon, 4),
                "intensity_ka": intensity,
                "polarity": polarity
            }
            normalized_strikes.append(strike)

        logger.info(f"[IMD] Successfully parsed {len(normalized_strikes)} lightning strikes")
        status_tracker.update_source(
            source_key="lightning",
            status="CONNECTED",
            latency_ms=res["latency_ms"],
            records_count=len(normalized_strikes),
            latest_obs_time=latest_ts
        )

        return {
            "success": True,
            "status": "CONNECTED",
            "latency_ms": res["latency_ms"],
            "strikes_count": len(normalized_strikes),
            "latest_observation_timestamp": latest_ts,
            "strikes": normalized_strikes
        }

    def convert_strikes_to_density_grid(
        self,
        strikes: List[Dict[str, Any]],
        grid_bounds: Dict[str, float] = config.GRID_BOUNDS,
        rows: int = 64,
        cols: int = 64
    ) -> np.ndarray:
        """
        Bins point lightning strike events into a 2D spatial flash density grid [rows, cols] (flashes / km^2).
        """
        density_grid = np.zeros((rows, cols), dtype=np.float32)
        if not strikes:
            return density_grid

        min_lat = grid_bounds["min_lat"]
        max_lat = grid_bounds["max_lat"]
        min_lon = grid_bounds["min_lon"]
        max_lon = grid_bounds["max_lon"]

        lat_step = (max_lat - min_lat) / rows
        lon_step = (max_lon - min_lon) / cols

        for st in strikes:
            lat = st.get("latitude")
            lon = st.get("longitude")
            if lat is None or lon is None:
                continue

            if min_lat <= lat <= max_lat and min_lon <= lon <= max_lon:
                r_idx = int((lat - min_lat) / lat_step)
                c_idx = int((lon - min_lon) / lon_step)
                r_idx = min(r_idx, rows - 1)
                c_idx = min(c_idx, cols - 1)
                density_grid[r_idx, c_idx] += 1.0

        return density_grid

lightning_connector = IMDLightningConnector()
