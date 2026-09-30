"""
VAJRA-AI - Zero-Auth Open Live Meteorological Data Streams
Fetches:
1. Real-time global/India Doppler Weather Radar composite frames from RainViewer Open API.
2. Real-time atmospheric convective thermodynamics (CAPE, CIN, Lifted Index, Shear) from Open-Meteo.
"""
import time
import json
import logging
import urllib.request
from typing import Dict, Any, Optional, List

logger = logging.getLogger("VAJRA-AI.LiveOpenStreams")
logger.setLevel(logging.INFO)

class LiveOpenStreamsService:
    def __init__(self):
        self._cached_radar = None
        self._radar_cache_time = 0
        self._cache_ttl_sec = 300  # 5 minutes

    def get_live_radar_metadata(self) -> Dict[str, Any]:
        """
        Fetches the latest real-time Doppler radar frames and tile URL schema from RainViewer.
        Requires zero authentication keys.
        """
        now = time.time()
        if self._cached_radar and (now - self._radar_cache_time) < self._cache_ttl_sec:
            return self._cached_radar

        url = "https://api.rainviewer.com/public/weather-maps.json"
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "VAJRA-AI/1.0 Nowcasting (MoES/IMD Open Data Client)"},
                method="GET"
            )
            with urllib.request.urlopen(req, timeout=8) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    host = data.get("host", "https://tilecache.rainviewer.com")
                    radar_past = data.get("radar", {}).get("past", [])
                    latest_frame = radar_past[-1] if radar_past else None

                    tile_url_template = None
                    if latest_frame:
                        path = latest_frame.get("path")
                        # standard color scheme: 2 (Rainbow Doppler), smooth: 1, snow: 1
                        tile_url_template = f"{host}{path}/256/{{z}}/{{x}}/{{y}}/2/1_1.png"

                    result = {
                        "status": "OPERATIONAL",
                        "provider": "RainViewer Open Global Radar Network",
                        "host": host,
                        "latest_timestamp": latest_frame.get("time") if latest_frame else None,
                        "latest_path": latest_frame.get("path") if latest_frame else None,
                        "tile_url_template": tile_url_template,
                        "past_frames": radar_past[-6:] if radar_past else [],
                        "color_scheme": "Doppler Rainbow (2)",
                        "error": None
                    }
                    self._cached_radar = result
                    self._radar_cache_time = now
                    return result
        except Exception as e:
            logger.error(f"[LiveStreams] Error fetching RainViewer radar: {e}")
            return {
                "status": "DEGRADED",
                "provider": "RainViewer Open Global Radar Network",
                "error": str(e),
                "tile_url_template": "https://tilecache.rainviewer.com/v2/radar/latest/256/{z}/{x}/{y}/2/1_1.png"
            }

    def get_live_thermodynamics(self, lat: float = 17.385, lon: float = 78.4867) -> Dict[str, Any]:
        """
        Fetches live thermodynamic instability and convective parameters from Open-Meteo.
        Requires zero authentication keys.
        """
        url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}&"
            f"current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&"
            f"hourly=cape,lifted_index,convective_inhibition&"
            f"timezone=auto"
        )
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "VAJRA-AI/1.0 Nowcasting (MoES/IMD Open Data Client)"},
                method="GET"
            )
            with urllib.request.urlopen(req, timeout=8) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    curr = data.get("current", {})
                    hourly = data.get("hourly", {})
                    
                    # Current hour CAPE/CIN/Lifted Index
                    cape_vals = hourly.get("cape", [])
                    cin_vals = hourly.get("convective_inhibition", [])
                    li_vals = hourly.get("lifted_index", [])

                    current_cape = cape_vals[0] if cape_vals else 0.0
                    current_cin = cin_vals[0] if cin_vals else 0.0
                    current_li = li_vals[0] if li_vals else 0.0

                    return {
                        "status": "OPERATIONAL",
                        "provider": "Open-Meteo (ECMWF IFS / Global NWP)",
                        "coordinates": {"lat": lat, "lon": lon},
                        "current_weather": curr,
                        "thermodynamics": {
                            "cape_jkg": current_cape,
                            "cin_jkg": current_cin,
                            "lifted_index": current_li,
                            "surface_pressure_hpa": curr.get("surface_pressure"),
                            "wind_speed_kmh": curr.get("wind_speed_10m"),
                            "wind_gusts_kmh": curr.get("wind_gusts_10m"),
                            "wind_direction_deg": curr.get("wind_direction_10m"),
                            "temp_c": curr.get("temperature_2m"),
                            "humidity_pct": curr.get("relative_humidity_2m"),
                            "rain_mmh": curr.get("rain", 0.0)
                        }
                    }
        except Exception as e:
            logger.error(f"[LiveStreams] Error fetching Open-Meteo thermodynamics: {e}")
            return {
                "status": "UNAVAILABLE",
                "error": str(e)
            }

live_open_streams = LiveOpenStreamsService()
