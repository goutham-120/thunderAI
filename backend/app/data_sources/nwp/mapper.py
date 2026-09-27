"""
NWP & Real Weather Data Mapper
Maps raw provider response payloads into VAJRA's internal standardized NWP/Weather format.

MODEL INTEGRITY RULE:
DO NOT map general weather variables (temperature, precipitation, wind speed) to specialized radar/lightning/satellite channels.
Radar reflectivity, radial velocity, and lightning density are kept distinct and tagged according to exact sensor observation availability.
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from app.data_sources.imd.validation import parse_iso_timestamp, safe_float

logger = logging.getLogger("VAJRA-AI.NWPMapper")

def _get_val(dictionary: Dict[str, Any], keys: List[str]) -> Any:
    """Helper to safely extract the first key present in dictionary with a non-None value."""
    if not isinstance(dictionary, dict):
        return None
    for k in keys:
        if k in dictionary and dictionary[k] is not None:
            return dictionary[k]
    return None

def map_provider_response_to_vajra(
    raw_payload: Dict[str, Any],
    fallback_lat: float = 17.6868,
    fallback_lon: float = 83.2185,
    latency_ms: Optional[float] = None
) -> Dict[str, Any]:
    """
    Transforms provider JSON (Open-Meteo, WeatherAPI, OpenWeatherMap, or generic NWP API)
    into internal VAJRA standardized NWP weather object.
    Never fabricates missing values or corrupts multimodal channel provenance.
    """
    if not raw_payload:
        return {}

    provider_name = "NWP Weather Provider"
    lat = fallback_lat
    lon = fallback_lon
    elevation = None
    tz = "UTC"
    timestamp = datetime.now(timezone.utc).isoformat()

    temp_c = None
    rh_percent = None
    press_hpa = None
    wind_kmh = None
    wind_deg = None
    precip_mm = None
    cloud_percent = None
    cape_jkg = None
    cin_jkg = None
    wind_shear_kts = None

    # Detect Provider: 1. Open-Meteo
    if "current" in raw_payload or "current_weather" in raw_payload or "hourly" in raw_payload:
        provider_name = "Open-Meteo NWP Forecast Engine"
        lat = safe_float(raw_payload.get("latitude"), decimals=4) or fallback_lat
        lon = safe_float(raw_payload.get("longitude"), decimals=4) or fallback_lon
        elevation = safe_float(raw_payload.get("elevation"))
        tz = str(raw_payload.get("timezone", "UTC"))

        curr = raw_payload.get("current") or raw_payload.get("current_weather") or {}
        if isinstance(curr, dict):
            raw_ts = curr.get("time")
            timestamp = parse_iso_timestamp(raw_ts) or timestamp

            temp_c = safe_float(_get_val(curr, ["temperature_2m", "temperature", "temp"]), min_val=-50.0, max_val=60.0)
            rh_percent = safe_float(_get_val(curr, ["relative_humidity_2m", "relative_humidity", "humidity"]), min_val=0.0, max_val=100.0)
            press_hpa = safe_float(_get_val(curr, ["surface_pressure", "pressure_msl", "pressure"]), min_val=800.0, max_val=1100.0)
            wind_kmh = safe_float(_get_val(curr, ["wind_speed_10m", "windspeed", "wind_speed"]), min_val=0.0, max_val=250.0)
            wind_deg = safe_float(_get_val(curr, ["wind_direction_10m", "winddirection", "wind_direction"]), min_val=0.0, max_val=360.0)
            precip_mm = safe_float(_get_val(curr, ["precipitation", "rain", "precip_mm"]), min_val=0.0, max_val=500.0)
            cloud_percent = safe_float(_get_val(curr, ["cloud_cover", "cloudcover", "clouds"]), min_val=0.0, max_val=100.0)
            cape_jkg = safe_float(_get_val(curr, ["cape"]), min_val=0.0, max_val=6000.0)

        # Fallback to first entry of hourly if current is missing
        hourly = raw_payload.get("hourly")
        if isinstance(hourly, dict) and "temperature_2m" in hourly and isinstance(hourly["temperature_2m"], list):
            if temp_c is None and len(hourly["temperature_2m"]) > 0:
                temp_c = safe_float(hourly["temperature_2m"][0])
            if rh_percent is None and "relative_humidity_2m" in hourly and len(hourly["relative_humidity_2m"]) > 0:
                rh_percent = safe_float(hourly["relative_humidity_2m"][0])
            if press_hpa is None and "surface_pressure" in hourly and len(hourly["surface_pressure"]) > 0:
                press_hpa = safe_float(hourly["surface_pressure"][0])
            if precip_mm is None and "precipitation" in hourly and len(hourly["precipitation"]) > 0:
                precip_mm = safe_float(hourly["precipitation"][0])
            if wind_kmh is None and "wind_speed_10m" in hourly and len(hourly["wind_speed_10m"]) > 0:
                wind_kmh = safe_float(hourly["wind_speed_10m"][0])
            if cape_jkg is None and "cape" in hourly and len(hourly["cape"]) > 0:
                cape_jkg = safe_float(hourly["cape"][0])

    # Detect Provider: 2. WeatherAPI.com
    elif "current" in raw_payload and "location" in raw_payload:
        provider_name = "WeatherAPI.com Live Station Network"
        loc = raw_payload.get("location", {})
        curr = raw_payload.get("current", {})
        lat = safe_float(loc.get("lat"), decimals=4) or fallback_lat
        lon = safe_float(loc.get("lon"), decimals=4) or fallback_lon
        timestamp = parse_iso_timestamp(curr.get("last_updated")) or timestamp

        temp_c = safe_float(curr.get("temp_c"))
        rh_percent = safe_float(curr.get("humidity"))
        press_hpa = safe_float(curr.get("pressure_mb"))
        wind_kmh = safe_float(curr.get("wind_kph"))
        wind_deg = safe_float(curr.get("wind_degree"))
        precip_mm = safe_float(curr.get("precip_mm"))
        cloud_percent = safe_float(curr.get("cloud"))

    # Detect Provider: 3. OpenWeatherMap
    elif "main" in raw_payload and "weather" in raw_payload:
        provider_name = "OpenWeatherMap Meteorological API"
        coord = raw_payload.get("coord", {})
        main = raw_payload.get("main", {})
        wind = raw_payload.get("wind", {})
        rain = raw_payload.get("rain", {})
        clouds = raw_payload.get("clouds", {})

        lat = safe_float(coord.get("lat"), decimals=4) or fallback_lat
        lon = safe_float(coord.get("lon"), decimals=4) or fallback_lon
        timestamp = parse_iso_timestamp(raw_payload.get("dt")) or timestamp

        temp_c = safe_float(main.get("temp"))
        rh_percent = safe_float(main.get("humidity"))
        press_hpa = safe_float(main.get("pressure"))
        wind_kmh = safe_float(wind.get("speed"))
        if wind_kmh is not None:
            wind_kmh = round(wind_kmh * 3.6, 2)
        wind_deg = safe_float(wind.get("deg"))
        precip_mm = safe_float(_get_val(rain, ["1h", "3h"]))
        cloud_percent = safe_float(clouds.get("all"))

    else:
        # Generic dictionary extraction
        lat = safe_float(_get_val(raw_payload, ["latitude", "lat"]), decimals=4) or fallback_lat
        lon = safe_float(_get_val(raw_payload, ["longitude", "lon"]), decimals=4) or fallback_lon
        timestamp = parse_iso_timestamp(_get_val(raw_payload, ["timestamp", "time", "date"])) or timestamp

        temp_c = safe_float(_get_val(raw_payload, ["temperature_c", "temperature", "temp"]))
        rh_percent = safe_float(_get_val(raw_payload, ["relative_humidity_percent", "relative_humidity", "humidity", "rh"]))
        press_hpa = safe_float(_get_val(raw_payload, ["pressure_hpa", "pressure", "mslp"]))
        wind_kmh = safe_float(_get_val(raw_payload, ["wind_speed_kmh", "wind_speed", "w_speed"]))
        wind_deg = safe_float(_get_val(raw_payload, ["wind_direction_deg", "wind_direction", "w_dir"]))
        precip_mm = safe_float(_get_val(raw_payload, ["precipitation_mm", "precipitation", "rainfall", "rain"]))
        cloud_percent = safe_float(_get_val(raw_payload, ["cloud_cover_percent", "cloud_cover", "clouds"]))
        cape_jkg = safe_float(_get_val(raw_payload, ["cape_jkg", "cape"]))

    return {
        "source": provider_name,
        "provenance": "real",
        "latitude": lat,
        "longitude": lon,
        "timestamp": timestamp,
        "variables": {
            "temperature_c": temp_c,
            "relative_humidity_percent": rh_percent,
            "pressure_hpa": press_hpa,
            "wind_speed_kmh": wind_kmh,
            "wind_direction_deg": wind_deg,
            "precipitation_mm": precip_mm,
            "cloud_cover_percent": cloud_percent,
            "cape_jkg": cape_jkg,
            "cin_jkg": cin_jkg,
            "wind_shear_kts": wind_shear_kts
        },
        "nwp_feature_layers": {
            "temperature": temp_c,
            "humidity": rh_percent,
            "precipitation": precip_mm,
            "wind": wind_kmh,
            "cloud_cover": cloud_percent,
            "thermodynamic_cape": cape_jkg
        },
        "multimodal_sensor_status": {
            "radar_reflectivity_dbz": "NOT_OBSERVED_BY_NWP_API (Requires Doppler Radar)",
            "radial_velocity_ms": "NOT_OBSERVED_BY_NWP_API (Requires Doppler Radar)",
            "lightning_flash_density": "NOT_OBSERVED_BY_NWP_API (Requires Lightning Network)",
            "satellite_tir_k": "NOT_OBSERVED_BY_NWP_API (Requires MOSDAC Satellite)",
            "satellite_wv_k": "NOT_OBSERVED_BY_NWP_API (Requires MOSDAC Satellite)"
        },
        "metadata": {
            "latency_ms": latency_ms,
            "elevation_m": elevation,
            "timezone": tz,
            "ingested_at": datetime.now(timezone.utc).isoformat()
        }
    }
