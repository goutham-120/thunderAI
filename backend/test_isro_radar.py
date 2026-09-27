"""
ISRO Doppler Weather Radar (DWR) Test Suite (Step 3)
Tests credential verification, unconfigured fallback, volume scan parsing, spatial regridding, payload validation, and tensor integration.
"""
import pytest
import numpy as np
import os
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.config import config
from app.services.isro_radar.client import ISRORadarClient, isro_radar_client
from app.services.isro_radar.validation import validate_radar_response
from app.services.isro_radar.parser import parse_radar_volume_scan, resample_radar_to_grid
from app.services.data_harmonizer import harmonizer

client = TestClient(app)

# 1. Test missing credentials behavior
def test_missing_credentials_returns_unavailable():
    with patch.dict(os.environ, {"ISRO_DWR_USERNAME": "", "ISRO_DWR_PASSWORD": "", "ISRO_DWR_API_URL": ""}):
        radar_cli = ISRORadarClient()
        assert not radar_cli.is_configured()
        
        status = radar_cli.get_status()
        assert status["status"] == "UNAVAILABLE"
        assert status["reason"] == "ISRO_DWR_ACCESS_NOT_CONFIGURED"
        assert status["provenance"] == "NONE"
        
        res = radar_cli.fetch_radar_observations(latitude=17.68, longitude=83.20)
        assert res["status"] == "UNAVAILABLE"
        assert res["reason"] == "ISRO_DWR_ACCESS_NOT_CONFIGURED"
        assert res["provenance"] == "NONE"
        assert res["data"] is None

# 2. Test network failure / HTTP error handling
def test_network_failure_handling():
    with patch.dict(os.environ, {"ISRO_DWR_USERNAME": "user", "ISRO_DWR_PASSWORD": "pass", "ISRO_DWR_API_URL": "http://127.0.0.1:8899/invalid"}):
        radar_cli = ISRORadarClient()
        assert radar_cli.is_configured()
        
        with patch("urllib.request.urlopen", side_effect=Exception("Connection refused")):
            res = radar_cli.fetch_radar_observations(17.68, 83.20)
            assert res["status"] == "UNAVAILABLE"
            assert res["provenance"] == "NONE"
            assert "Connection refused" in res["reason"]

# 3. Test malformed payload validation
def test_malformed_radar_validation():
    # Non-dict
    is_valid, err = validate_radar_response("invalid string") # type: ignore
    assert not is_valid
    assert "dictionary" in err

    # Error status code
    is_valid, err = validate_radar_response({"status_code": 500, "error": "Internal Server Error"})
    assert not is_valid
    assert "500" in err

    # Missing reflectivity observations
    is_valid, err = validate_radar_response({"data": {"site_id": "VSKP"}})
    assert not is_valid
    assert "missing" in err.lower()

    # Invalid latitude
    is_valid, err = validate_radar_response({"data": {"reflectivity_dbz": 45.0, "latitude": 200.0}})
    assert not is_valid
    assert "latitude" in err

# 4. Test volume scan parsing & spatial regridding
def test_volume_scan_parsing_and_regridding():
    sample_scan = {
        "timestamp": "2026-09-27T12:00:00+00:00",
        "data": {
            "radar_site": "Visakhapatnam (VSKP DWR)",
            "site_lat": 17.68,
            "site_lon": 83.21,
            "reflectivity_dbz": [[35.0, 45.0], [55.0, 65.0]],
            "radial_velocity_ms": [[-12.0, 5.0], [18.0, 24.0]]
        }
    }
    
    is_valid, err = validate_radar_response(sample_scan)
    assert is_valid
    assert err is None
    
    parsed = parse_radar_volume_scan(sample_scan, target_bounds=config.GRID_BOUNDS, target_rows=64, target_cols=64)
    assert parsed["source"] == "ISRO DWR"
    assert parsed["radar_site"] == "Visakhapatnam (VSKP DWR)"
    assert parsed["provenance"] == "REAL"
    assert parsed["max_dbz"] == 65.0
    assert parsed["dbz_grid"].shape == (64, 64)
    assert parsed["velocity_grid"].shape == (64, 64)

# 5. Test geographic coverage verification (Visakhapatnam / AP cluster)
def test_geographic_coverage():
    parsed = parse_radar_volume_scan({"data": {"reflectivity_dbz": 30.0}}, target_bounds=config.GRID_BOUNDS)
    assert "Visakhapatnam" in parsed["coverage"]
    assert "Andhra Pradesh" in parsed["coverage"]

# 6. Test API routes
def test_radar_status_endpoint():
    resp = client.get("/api/data/radar/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["source"] == "ISRO DWR"
    assert "status" in data
    assert "coverage" in data

def test_radar_observations_endpoint():
    resp = client.get("/api/data/radar/observations?lat=17.68&lon=83.20")
    assert resp.status_code == 200
    data = resp.json()
    assert data["source"] == "ISRO DWR"
    assert "status" in data

# 7. Test DataHarmonizer tensor integration & provenance
def test_data_harmonizer_radar_integration():
    cube = harmonizer.get_convective_cube(data_mode="synthetic")
    prov = cube.get("channel_provenance", {})
    assert "radar_dbz" in prov
    assert "radial_velocity" in prov
    assert "SYNTHETIC" in prov["radar_dbz"] or "REAL" in prov["radar_dbz"]
