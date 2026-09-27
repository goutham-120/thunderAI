"""
VAJRA-AI Backend Configuration
SIH Problem Statement 26072 - MoES / IMD
"""
import os
from dotenv import load_dotenv
from pydantic import BaseModel

# Automatically load environment variables from .env if present
load_dotenv()

class SystemConfig(BaseModel):
    PROJECT_NAME: str = "VAJRA-AI"
    VERSION: str = "1.0.0"
    ORGANIZATION: str = "Ministry of Earth Sciences (MoES) / India Meteorological Department (IMD)"
    THEME: str = "Disaster Management & Nowcasting"
    DEFAULT_REGION: str = "Telangana & Andhra Pradesh (Hyderabad DWR Cluster)"
    GRID_BOUNDS: dict = {
        "min_lat": 15.5,
        "max_lat": 19.5,
        "min_lon": 76.5,
        "max_lon": 81.5,
        "resolution_km": 1.0,
        "grid_rows": 64,
        "grid_cols": 64
    }
    HORIZONS_MINUTES: list[int] = [15, 30, 45, 60, 90, 120, 180]
    RADAR_CHANNELS: list[str] = ["reflectivity_dbz", "radial_velocity_ms"]
    SATELLITE_CHANNELS: list[str] = ["tir1_temp_k", "water_vapor_k"]
    LIGHTNING_CHANNELS: list[str] = ["flash_density", "flash_rate_trend"]
    NWP_CHANNELS: list[str] = ["cape_jkg", "cin_jkg", "wind_shear_0_6km", "tpw_mm"]

    # IMD Step 1A Real Data Configuration
    DATA_MODE: str = os.getenv("DATA_MODE", "synthetic")
    IMD_AWS_API_URL: str = os.getenv("IMD_AWS_API_URL", "https://api.imd.gov.in/v1/aws")
    IMD_RADAR_API_URL: str = os.getenv("IMD_RADAR_API_URL", "https://api.imd.gov.in/v1/radar")
    IMD_LIGHTNING_API_URL: str = os.getenv("IMD_LIGHTNING_API_URL", "https://api.imd.gov.in/v1/lightning")
    IMD_API_KEY: str = os.getenv("IMD_API_KEY", "")
    IMD_AUTH_TOKEN: str = os.getenv("IMD_AUTH_TOKEN", "")
    IMD_REQUEST_TIMEOUT_SEC: int = int(os.getenv("IMD_REQUEST_TIMEOUT_SEC", "10"))

    # Step 2 Real NWP / Weather API Configuration
    WEATHER_API_URL: str = os.getenv("WEATHER_API_URL", "https://api.open-meteo.com/v1/forecast")
    WEATHER_API_KEY: str = os.getenv("WEATHER_API_KEY", "")
    WEATHER_LAT: float = float(os.getenv("WEATHER_LAT", "17.6868"))
    WEATHER_LON: float = float(os.getenv("WEATHER_LON", "83.2185"))
    WEATHER_TIMEOUT_SEC: int = int(os.getenv("WEATHER_TIMEOUT_SEC", "15"))
    WEATHER_MAX_RETRIES: int = int(os.getenv("WEATHER_MAX_RETRIES", "3"))

    # Step 2 Open-Meteo ECMWF Real NWP Configuration
    OPEN_METEO_API_URL: str = os.getenv("OPEN_METEO_API_URL", "https://api.open-meteo.com/v1/ecmwf")
    OPEN_METEO_LAT: float = float(os.getenv("OPEN_METEO_LAT", "17.68014"))
    OPEN_METEO_LON: float = float(os.getenv("OPEN_METEO_LON", "83.204254"))
    OPEN_METEO_VARIABLES: str = os.getenv(
        "OPEN_METEO_VARIABLES",
        "temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,cloud_cover,wind_speed_10m,wind_speed_100m,wind_speed_200m,cape,convective_inhibition,total_column_integrated_water_vapour"
    )
    OPEN_METEO_TIMEOUT_SEC: int = int(os.getenv("OPEN_METEO_TIMEOUT_SEC", "15"))
    OPEN_METEO_MAX_RETRIES: int = int(os.getenv("OPEN_METEO_MAX_RETRIES", "3"))
    ALLOW_SYNTHETIC_FALLBACK: bool = os.getenv("ALLOW_SYNTHETIC_FALLBACK", "true").lower() in ("true", "1", "yes")

    # Step 3 MOSDAC Satellite Data Configuration
    MOSDAC_USERNAME: str = os.getenv("MOSDAC_USERNAME", "")
    MOSDAC_PASSWORD: str = os.getenv("MOSDAC_PASSWORD", "")
    MOSDAC_API_URL: str = os.getenv("MOSDAC_API_URL", "")
    MOSDAC_DATASET_ID: str = os.getenv("MOSDAC_DATASET_ID", "GSMaP_ISRO_RAIN")
    MOSDAC_REQUEST_TIMEOUT_SEC: int = int(os.getenv("MOSDAC_REQUEST_TIMEOUT_SEC", "30"))
    MOSDAC_MAX_RETRIES: int = int(os.getenv("MOSDAC_MAX_RETRIES", "3"))

    # Step 4 ISRO Doppler Weather Radar (DWR) Configuration
    ISRO_DWR_USERNAME: str = os.getenv("ISRO_DWR_USERNAME", "")
    ISRO_DWR_PASSWORD: str = os.getenv("ISRO_DWR_PASSWORD", "")
    ISRO_DWR_API_URL: str = os.getenv("ISRO_DWR_API_URL", "")
    ISRO_DWR_RADAR_ID: str = os.getenv("ISRO_DWR_RADAR_ID", "VISAKHAPATNAM_DWR")

config = SystemConfig()
