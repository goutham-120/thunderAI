"""
NWP & Real Weather API Router (Step 2)
Exposes normalized Open-Meteo ECMWF 9km real NWP forecasts and current weather observations.

RESPONSE SCHEMA REQUIREMENTS:
- application_mode: System-wide DATA_MODE setting ('synthetic' or 'real')
- source_status: Specific connector status ('REAL', 'SYNTHETIC', 'SYNTHETIC_FALLBACK', 'OFFLINE')
- provenance: Provenance tag ('REAL', 'SYNTHETIC', 'SYNTHETIC_FALLBACK')
- source: Provider name ('Open-Meteo')
- model: Model designation ('ECMWF IFS HRES')
- resolution: Spatial resolution ('9 km')

SECURITY MANDATE:
NEVER return or expose WEATHER_API_KEY in any API response or log.
"""
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, Dict, Any
from app.config import config
from app.services.open_meteo.client import open_meteo_client
from app.services.open_meteo.validation import validate_open_meteo_response
from app.services.open_meteo.mapper import map_ecmwf_response_to_vajra
from app.data_sources.imd.status import status_tracker

logger = logging.getLogger("VAJRA-AI.WeatherRouter")
router = APIRouter(prefix="/api/weather", tags=["NWP Weather Data Connector"])

@router.get("/current")
def get_current_weather(
    lat: float = Query(default=config.OPEN_METEO_LAT, description="Latitude in decimal degrees"),
    lon: float = Query(default=config.OPEN_METEO_LON, description="Longitude in decimal degrees")
):
    """
    Retrieves real-time weather & forecast variables from Open-Meteo 9 km ECMWF IFS HRES model.
    Returns normalized internal VAJRA weather payload with clear provenance tags.
    """
    res = open_meteo_client.fetch_ecmwf_forecast(latitude=lat, longitude=lon)
    is_valid, err_msg = validate_open_meteo_response(res)

    if is_valid:
        mapped = map_ecmwf_response_to_vajra(
            raw_payload=res["data"],
            target_lat=lat,
            target_lon=lon,
            latency_ms=res["latency_ms"]
        )

        status_tracker.update_source(
            source_key="open_meteo_ecmwf",
            status="REAL",
            latency_ms=res["latency_ms"],
            records_count=res.get("hourly_count", 0),
            latest_obs_time=mapped["timestamp"]
        )

        return {
            "status": "success",
            "application_mode": config.DATA_MODE,
            "source_status": "REAL",
            "provenance": "REAL",
            "source": "Open-Meteo",
            "model": "ECMWF IFS HRES",
            "resolution": "9 km",
            "data_type": "NWP forecast",
            "latitude": mapped["latitude"],
            "longitude": mapped["longitude"],
            "timestamp": mapped["timestamp"],
            "variables": mapped["current_variables"],
            "hourly_series": mapped["hourly_series"],
            "units": mapped["units"],
            "multimodal_sensor_status": mapped["multimodal_sensor_status"],
            "metadata": mapped["metadata"]
        }

    # If Open-Meteo request failed
    logger.warning(f"[WeatherRouter] Open-Meteo ECMWF fetch failed: {err_msg}")
    if config.ALLOW_SYNTHETIC_FALLBACK:
        status_tracker.update_source(
            source_key="open_meteo_ecmwf",
            status="SYNTHETIC_FALLBACK",
            latency_ms=res.get("latency_ms"),
            error_message=err_msg
        )

        now_iso = datetime.now(timezone.utc).isoformat()
        return {
            "status": "success",
            "application_mode": config.DATA_MODE,
            "source_status": "SYNTHETIC_FALLBACK",
            "provenance": "SYNTHETIC_FALLBACK",
            "source": "Open-Meteo (Synthetic Fallback)",
            "model": "ECMWF IFS HRES (Simulated)",
            "resolution": "9 km",
            "data_type": "NWP forecast (Fallback)",
            "latitude": lat,
            "longitude": lon,
            "timestamp": now_iso,
            "error_detail": err_msg,
            "variables": {
                "temperature_2m": 29.0,
                "relative_humidity_2m": 78.0,
                "dew_point_2m": 24.8,
                "precipitation_mm": 0.0,
                "cloud_cover_percent": 45.0,
                "wind_speed_10m": 18.0,
                "wind_speed_100m": 28.0,
                "wind_speed_200m": 38.0,
                "cape_jkg": 1840.0,
                "convective_inhibition_jkg": 25.0,
                "wind_shear_kts": 22.0,
                "total_precipitable_water_mm": 52.0
            },
            "units": {
                "temperature_2m": "°C",
                "relative_humidity_2m": "%",
                "precipitation_mm": "mm",
                "cloud_cover_percent": "%",
                "wind_speed_10m": "km/h",
                "cape_jkg": "J/kg"
            },
            "multimodal_sensor_status": {
                "radar_reflectivity_dbz": "UNAVAILABLE (Requires Doppler Radar)",
                "radial_velocity_ms": "UNAVAILABLE (Requires Doppler Radar)",
                "lightning_flash_density": "UNAVAILABLE (Requires Lightning Network)",
                "satellite_tir_k": "UNAVAILABLE (Requires MOSDAC Satellite)",
                "satellite_wv_k": "UNAVAILABLE (Requires MOSDAC Satellite)"
            },
            "metadata": {
                "latency_ms": res.get("latency_ms"),
                "ingested_at": now_iso
            }
        }
    else:
        status_tracker.update_source(
            source_key="open_meteo_ecmwf",
            status="OFFLINE",
            latency_ms=res.get("latency_ms"),
            error_message=err_msg
        )
        raise HTTPException(
            status_code=res.get("status_code", 502) if isinstance(res.get("status_code"), int) and res.get("status_code") >= 400 else 502,
            detail=f"Open-Meteo ECMWF request failed and ALLOW_SYNTHETIC_FALLBACK=False: {err_msg}"
        )

@router.get("/nwp")
def get_nwp_forecast(
    lat: float = Query(default=config.OPEN_METEO_LAT),
    lon: float = Query(default=config.OPEN_METEO_LON)
):
    """Endpoint exposing real 9 km ECMWF IFS HRES NWP forecast feature layer."""
    return get_current_weather(lat=lat, lon=lon)
