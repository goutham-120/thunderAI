"""
VAJRA-AI Backend Configuration
SIH Problem Statement 26072 - MoES / IMD
"""
import os
from pydantic import BaseModel

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

config = SystemConfig()
