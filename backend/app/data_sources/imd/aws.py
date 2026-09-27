"""
IMD AWS / ARG Data Connector
Ingests, validates, and normalizes observation data from IMD Automatic Weather Stations (AWS)
and Automatic Rain Gauges (ARG).
"""
import logging
from typing import Dict, Any, List, Optional
from app.config import config
from app.data_sources.imd.client import imd_client
from app.data_sources.imd.validation import validate_coordinates, parse_iso_timestamp, safe_float
from app.data_sources.imd.status import status_tracker

logger = logging.getLogger("VAJRA-AI.IMDAWSConnector")

class IMDAWSConnector:
    def __init__(self, api_url: Optional[str] = None):
        self.api_url = api_url if api_url is not None else config.IMD_AWS_API_URL

    def fetch_observations(self) -> Dict[str, Any]:
        """
        Fetches live AWS/ARG observations from the official IMD API endpoint.
        Normalizes responses and updates status tracker.
        Returns dictionary containing raw status, normalized observation list, and metadata.
        """
        logger.info(f"[IMD] Requesting AWS/ARG observation data from {self.api_url}")
        res = imd_client.get(self.api_url)

        if not res["success"]:
            logger.error(f"[IMD] AWS fetch failed: {res['status']} | {res['error']}")
            status_tracker.update_source(
                source_key="aws",
                status=res["status"],
                latency_ms=res["latency_ms"],
                error_message=res["error"]
            )
            return {
                "success": False,
                "status": res["status"],
                "error": res["error"],
                "latency_ms": res["latency_ms"],
                "observations": []
            }

        data_payload = res["data"]
        raw_list = []

        # Inspect dynamic JSON structure
        if isinstance(data_payload, list):
            raw_list = data_payload
        elif isinstance(data_payload, dict):
            if "data" in data_payload and isinstance(data_payload["data"], list):
                raw_list = data_payload["data"]
            elif "stations" in data_payload and isinstance(data_payload["stations"], list):
                raw_list = data_payload["stations"]
            elif "observations" in data_payload and isinstance(data_payload["observations"], list):
                raw_list = data_payload["observations"]
            else:
                # Dict of station_id -> observation
                raw_list = list(data_payload.values()) if all(isinstance(v, dict) for v in data_payload.values()) else [data_payload]

        normalized_obs: List[Dict[str, Any]] = []
        latest_ts = None

        for item in raw_list:
            if not isinstance(item, dict):
                continue

            # Extract fields dynamically without assuming key names
            station_id = str(item.get("station_id") or item.get("id") or item.get("stn_id") or item.get("code") or "UNKNOWN")
            station_name = item.get("station_name") or item.get("name") or item.get("stn_name") or station_id
            lat = item.get("latitude") or item.get("lat") or item.get("LATITUDE")
            lon = item.get("longitude") or item.get("lon") or item.get("lng") or item.get("LONGITUDE")

            if not validate_coordinates(lat, lon):
                continue

            f_lat = float(lat)
            f_lon = float(lon)
            raw_ts = item.get("timestamp") or item.get("time") or item.get("datetime") or item.get("date")
            parsed_ts = parse_iso_timestamp(raw_ts)

            if parsed_ts and (latest_ts is None or parsed_ts > latest_ts):
                latest_ts = parsed_ts

            # Extract meteorological fields (using None when missing)
            temp = safe_float(item.get("temperature") or item.get("temp") or item.get("temp_c") or item.get("TEMP"), min_val=-40.0, max_val=60.0)
            rh = safe_float(item.get("relative_humidity") or item.get("rh") or item.get("humidity") or item.get("RH"), min_val=0.0, max_val=100.0)
            dew = safe_float(item.get("dew_point") or item.get("dewpoint") or item.get("dew_point_c"), min_val=-40.0, max_val=50.0)
            press = safe_float(item.get("pressure") or item.get("mslp") or item.get("pressure_hpa") or item.get("SLP"), min_val=800.0, max_val=1100.0)
            w_speed = safe_float(item.get("wind_speed") or item.get("w_speed") or item.get("ws_kmh") or item.get("WS"), min_val=0.0, max_val=250.0)
            w_dir = safe_float(item.get("wind_direction") or item.get("w_dir") or item.get("wd_deg") or item.get("WD"), min_val=0.0, max_val=360.0)
            rain = safe_float(item.get("rainfall") or item.get("rain") or item.get("precip_mm") or item.get("RAIN"), min_val=0.0, max_val=500.0)

            obs = {
                "source": "IMD",
                "source_type": "AWS",
                "station_id": station_id,
                "station_name": station_name,
                "timestamp": parsed_ts,
                "latitude": round(f_lat, 4),
                "longitude": round(f_lon, 4),
                "temperature_c": temp,
                "relative_humidity": rh,
                "dew_point_c": dew,
                "pressure_hpa": press,
                "wind_speed": w_speed,
                "wind_direction": w_dir,
                "rainfall": rain
            }
            normalized_obs.append(obs)

        logger.info(f"[IMD] Successfully parsed {len(normalized_obs)} AWS observations")
        status_tracker.update_source(
            source_key="aws",
            status="CONNECTED",
            latency_ms=res["latency_ms"],
            records_count=len(normalized_obs),
            latest_obs_time=latest_ts
        )

        return {
            "success": True,
            "status": "CONNECTED",
            "latency_ms": res["latency_ms"],
            "observations_count": len(normalized_obs),
            "latest_observation_timestamp": latest_ts,
            "observations": normalized_obs
        }

aws_connector = IMDAWSConnector()
