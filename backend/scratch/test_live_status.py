import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from unittest.mock import patch
from app.main import app
from app.services.mosdac.client import mosdac_client
from app.services.isro_radar.client import isro_radar_client
from app.services.mosdac.parser import parse_insat_observations
from app.services.isro_radar.parser import parse_radar_volume_scan
from fastapi.testclient import TestClient

client = TestClient(app)

print("=== TEST 1: UNCONFIGURED RUNTIME STATUS ===")
r1 = client.get("/api/system/status").json()
print("data_sources:", r1["data_sources"])
print("sat_tir1_k provenance:", r1["channel_provenance"]["sat_tir1_k"])
print("radar_dbz provenance:", r1["channel_provenance"]["radar_dbz"])

sample_insat = {
    "timestamp": "2026-09-27T18:00:00+00:00",
    "data": {
        "tir1_temp_k": 225.0,
        "water_vapor_k": 240.0
    }
}

sample_radar = {
    "timestamp": "2026-09-27T18:00:00+00:00",
    "data": {
        "radar_site": "HYDERABAD_DWR",
        "reflectivity_dbz": 45.0,
        "radial_velocity_ms": -12.0
    }
}

with patch.object(mosdac_client, "is_configured", return_value=True), \
     patch.object(mosdac_client, "fetch_insat_observations", return_value={"status": "AVAILABLE", "data": parse_insat_observations(sample_insat), "provenance": "REAL"}), \
     patch.object(isro_radar_client, "is_configured", return_value=True), \
     patch.object(isro_radar_client, "fetch_radar_observations", return_value={"status": "AVAILABLE", "data": parse_radar_volume_scan(sample_radar), "provenance": "REAL"}):
    
    print("\n=== TEST 2: CONFIGURED LIVE RUNTIME STATUS ===")
    r2 = client.get("/api/system/status").json()
    print("data_sources:", r2["data_sources"])
    print("sat_tir1_k provenance:", r2["channel_provenance"]["sat_tir1_k"])
    print("radar_dbz provenance:", r2["channel_provenance"]["radar_dbz"])
