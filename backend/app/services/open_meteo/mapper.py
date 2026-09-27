"""
Open-Meteo ECMWF Data Mapper
Maps Open-Meteo 9 km ECMWF IFS HRES responses into VAJRA's internal NWP format.

MODEL INTEGRITY MANDATE:
Do NOT map general NWP variables (precipitation, cloud cover) into specialized radar/satellite/lightning sensor channels.
Radar reflectivity, radial velocity, lightning density, satellite TIR, and satellite WV are preserved as UNAVAILABLE/SYNTHETIC_FALLBACK.
"""
import logging
import numpy as np
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from app.config import config
from app.data_sources.imd.validation import parse_iso_timestamp, safe_float

logger = logging.getLogger("VAJRA-AI.OpenMeteoMapper")

def map_ecmwf_response_to_vajra(
    raw_payload: Dict[str, Any],
    target_lat: float = config.OPEN_METEO_LAT,
    target_lon: float = config.OPEN_METEO_LON,
    latency_ms: Optional[float] = None
) -> Dict[str, Any]:
    """
    Transforms validated Open-Meteo ECMWF JSON payload into VAJRA's internal NWP representation.
    Extracts hourly time series, current timestep values, units, and explicit provenance.
    """
    if not isinstance(raw_payload, dict):
        return {}

    hourly = raw_payload.get("hourly", {})
    units = raw_payload.get("hourly_units", {})
    lat = safe_float(raw_payload.get("latitude"), decimals=4) or target_lat
    lon = safe_float(raw_payload.get("longitude"), decimals=4) or target_lon
    elevation = safe_float(raw_payload.get("elevation"))
    tz = str(raw_payload.get("timezone", "UTC"))

    time_list = hourly.get("time", [])
    parsed_timestamps = [parse_iso_timestamp(t) or str(t) for t in time_list]

    # Current forecast step (index 0 or closest to present time)
    curr_idx = 0
    now_iso = datetime.now(timezone.utc).isoformat()
    if parsed_timestamps:
        for idx, ts in enumerate(parsed_timestamps):
            if ts and ts >= now_iso:
                curr_idx = idx
                break
        else:
            curr_idx = 0

    latest_timestamp = parsed_timestamps[curr_idx] if parsed_timestamps else now_iso

    # Extract ECMWF variables
    temp_2m = hourly.get("temperature_2m", [])
    rh_2m = hourly.get("relative_humidity_2m", [])
    dew_2m = hourly.get("dew_point_2m", [])
    precip = hourly.get("precipitation", [])
    clouds = hourly.get("cloud_cover", [])
    wind_10m = hourly.get("wind_speed_10m", [])
    wind_100m = hourly.get("wind_speed_100m", [])
    wind_200m = hourly.get("wind_speed_200m", [])
    cape = hourly.get("cape", [])
    cin = hourly.get("convective_inhibition", [])
    tpw = hourly.get("total_column_integrated_water_vapour", [])

    def get_at(arr: List[Any], idx: int) -> Optional[float]:
        if idx < len(arr) and arr[idx] is not None:
            return safe_float(arr[idx])
        return None

    # Current values
    curr_temp = get_at(temp_2m, curr_idx)
    curr_rh = get_at(rh_2m, curr_idx)
    curr_dew = get_at(dew_2m, curr_idx)
    curr_precip = get_at(precip, curr_idx)
    curr_clouds = get_at(clouds, curr_idx)
    curr_wind10 = get_at(wind_10m, curr_idx)
    curr_wind100 = get_at(wind_100m, curr_idx)
    curr_wind200 = get_at(wind_200m, curr_idx)
    curr_cape = get_at(cape, curr_idx)
    curr_cin = get_at(cin, curr_idx)
    curr_tpw = get_at(tpw, curr_idx)

    # Derived Bulk Wind Shear from 10m vs 200m (or 100m) levels (knots)
    curr_shear = None
    if curr_wind10 is not None and curr_wind200 is not None:
        curr_shear = round(abs(curr_wind200 - curr_wind10) * 0.539957, 1) # km/h to knots
    elif curr_wind10 is not None and curr_wind100 is not None:
        curr_shear = round(abs(curr_wind100 - curr_wind10) * 0.539957, 1)

    # Standardized Units dictionary
    standard_units = {
        "temperature_2m": units.get("temperature_2m", "°C"),
        "relative_humidity_2m": units.get("relative_humidity_2m", "%"),
        "dew_point_2m": units.get("dew_point_2m", "°C"),
        "precipitation": units.get("precipitation", "mm"),
        "cloud_cover": units.get("cloud_cover", "%"),
        "wind_speed_10m": units.get("wind_speed_10m", "km/h"),
        "wind_speed_100m": units.get("wind_speed_100m", "km/h"),
        "wind_speed_200m": units.get("wind_speed_200m", "km/h"),
        "cape": units.get("cape", "J/kg"),
        "convective_inhibition": units.get("convective_inhibition", "J/kg"),
        "total_column_integrated_water_vapour": units.get("total_column_integrated_water_vapour", "kg/m²")
    }

    provenance = {
        "source": "Open-Meteo",
        "model": "ECMWF IFS HRES",
        "resolution": "9 km",
        "data_type": "NWP forecast",
        "status": "REAL"
    }

    sensor_availability = {
        "radar_reflectivity_dbz": "UNAVAILABLE (Requires Doppler Radar)",
        "radial_velocity_ms": "UNAVAILABLE (Requires Doppler Radar)",
        "lightning_flash_density": "UNAVAILABLE (Requires Lightning Network)",
        "satellite_tir_k": "UNAVAILABLE (Requires ISRO Satellite)",
        "satellite_wv_k": "UNAVAILABLE (Requires ISRO Satellite)"
    }

    return {
        "provenance": provenance,
        "latitude": lat,
        "longitude": lon,
        "timestamp": latest_timestamp,
        "hourly_timestamps": parsed_timestamps,
        "units": standard_units,
        "current_variables": {
            "temperature_2m": curr_temp,
            "relative_humidity_2m": curr_rh,
            "dew_point_2m": curr_dew,
            "precipitation_mm": curr_precip,
            "cloud_cover_percent": curr_clouds,
            "wind_speed_10m": curr_wind10,
            "wind_speed_100m": curr_wind100,
            "wind_speed_200m": curr_wind200,
            "cape_jkg": curr_cape,
            "convective_inhibition_jkg": curr_cin,
            "wind_shear_kts": curr_shear,
            "total_precipitable_water_mm": curr_tpw
        },
        "hourly_series": {
            "time": parsed_timestamps,
            "temperature_2m": temp_2m,
            "relative_humidity_2m": rh_2m,
            "dew_point_2m": dew_2m,
            "precipitation": precip,
            "cloud_cover": clouds,
            "wind_speed_10m": wind_10m,
            "wind_speed_100m": wind_100m,
            "wind_speed_200m": wind_200m,
            "cape": cape,
            "convective_inhibition": cin,
            "total_column_integrated_water_vapour": tpw
        },
        "multimodal_sensor_status": sensor_availability,
        "metadata": {
            "elevation_m": elevation,
            "timezone": tz,
            "latency_ms": latency_ms,
            "ingested_at": now_iso
        }
    }
