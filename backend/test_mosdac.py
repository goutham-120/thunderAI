"""
MOSDAC Satellite Data Ingestion Test Suite (Step 2 & 3)
Tests credential verification, unconfigured fallback, error handling, payload validation, dataset parsing, and spatial regridding.
"""
import pytest
import numpy as np
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.config import config
from app.services.mosdac.client import MOSDACClient, mosdac_client
from app.services.mosdac.validation import validate_mosdac_response
from app.services.mosdac.parser import parse_gsmap_data, parse_insat_observations, resample_satellite_to_grid
from app.services.data_harmonizer import harmonizer

client = TestClient(app)

# 1. Test missing credentials behavior
def test_missing_credentials_returns_unavailable_not_configured():
    with patch.object(config, "MOSDAC_USERNAME", ""), \
         patch.object(config, "MOSDAC_PASSWORD", ""), \
         patch.object(config, "MOSDAC_API_URL", ""):
        
        mos_client = MOSDACClient()
        assert not mos_client.is_configured()
        
        status = mos_client.get_status()
        assert status["status"] == "UNAVAILABLE"
        assert status["reason"] == "MOSDAC_ACCESS_NOT_CONFIGURED"
        assert status["provenance"] == "NONE"
        
        res = mos_client.fetch_gsmap_precipitation(latitude=17.68, longitude=83.20)
        assert res["status"] == "UNAVAILABLE"
        assert res["reason"] == "MOSDAC_ACCESS_NOT_CONFIGURED"
        assert res["provenance"] == "NONE"
        assert res["data"] is None

# 2. Test unavailable access does not raise uncaught exceptions
def test_unavailable_access_handles_http_error_gracefully():
    with patch.object(config, "MOSDAC_USERNAME", "test_user"), \
         patch.object(config, "MOSDAC_PASSWORD", "test_pass"), \
         patch.object(config, "MOSDAC_API_URL", "https://api.mosdac.gov.in/v1/invalid"):
        
        mos_client = MOSDACClient()
        assert mos_client.is_configured()
        
        with patch("urllib.request.urlopen", side_effect=Exception("Connection refused")):
            res = mos_client.fetch_gsmap_precipitation(17.68, 83.20)
            assert res["status"] == "UNAVAILABLE"
            assert res["provenance"] == "NONE"
            assert "Connection refused" in res["reason"]
            assert res["data"] is None

# 3. Test malformed response validation
def test_malformed_response_validation():
    # Non-dict
    is_valid, err = validate_mosdac_response("invalid string") # type: ignore
    assert not is_valid
    assert "dictionary" in err

    # Error status code
    is_valid, err = validate_mosdac_response({"status_code": 500, "error": "Internal Server Error"})
    assert not is_valid
    assert "500" in err

    # Missing data / precipitation fields
    is_valid, err = validate_mosdac_response({"status": "ok"})
    assert not is_valid
    assert "missing" in err.lower()

    # Invalid lat/lon
    is_valid, err = validate_mosdac_response({"data": {"latitude": 200.0, "longitude": 80.0, "precipitation": 5.0}})
    assert not is_valid
    assert "latitude" in err

    # Negative precipitation
    is_valid, err = validate_mosdac_response({"data": {"latitude": 17.5, "longitude": 80.0, "precipitation": -10.0}})
    assert not is_valid
    assert "non-negative" in err

# 4. Test successful parsing using sample payload
def test_successful_gsmap_parsing_sample_data():
    sample_payload = {
        "timestamp": "2026-09-27T12:00:00+00:00",
        "latitude": 17.6801,
        "longitude": 83.2043,
        "precipitation": 12.5,
        "rain_rate": 12.5,
        "status_code": 200
    }
    
    is_valid, err = validate_mosdac_response({"data": sample_payload})
    assert is_valid
    assert err is None
    
    parsed = parse_gsmap_data(sample_payload, target_lat=17.6801, target_lon=83.2043)
    assert parsed["source"] in ("ISRO Satellite", "MOSDAC")
    assert parsed["product"] == "GSMaP ISRO Rain"
    assert parsed["precipitation"] == 12.5
    assert parsed["units"] == "mm/h"
    assert parsed["resolution"] == "0.1 degree"
    assert parsed["temporal_resolution"] == "hourly"
    assert parsed["coverage"] == "Indian Subcontinent"
    assert parsed["provenance"] == "REAL"
    assert parsed["latitude"] == 17.6801
    assert parsed["longitude"] == 83.2043

# 5. Test INSAT-3D/3DR observation parsing and spatial regridding
def test_insat_observations_parsing_and_regridding():
    sample_insat = {
        "timestamp": "2026-09-27T12:30:00+00:00",
        "data": {
            "tir1_temp_k": [[220.0, 230.0], [240.0, 250.0]],
            "water_vapor_k": [[235.0, 240.0], [245.0, 250.0]]
        }
    }
    parsed = parse_insat_observations(sample_insat, target_rows=64, target_cols=64)
    assert parsed["source"] in ("ISRO Satellite", "MOSDAC")
    assert parsed["product"] == "INSAT-3D/3DR L1B Imager"
    assert parsed["spatial_resolution"] == "4 km"
    assert parsed["provenance"] == "REAL"
    assert parsed["tir1_grid"].shape == (64, 64)
    assert parsed["wv_grid"].shape == (64, 64)
    assert parsed["min_cloud_top_temp_k"] == 220.0

# 6. Test MOSDAC status API route (/api/data/mosdac/status)
def test_mosdac_status_endpoint():
    resp = client.get("/api/data/mosdac/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["source"] in ("ISRO Satellite", "MOSDAC")
    assert "products" in data
    assert data["status"] in ("AVAILABLE", "UNAVAILABLE")

# 7. Test MOSDAC INSAT API route (/api/data/mosdac/insat)
def test_mosdac_insat_endpoint():
    resp = client.get("/api/data/mosdac/insat?lat=17.68&lon=83.20")
    assert resp.status_code == 200
    data = resp.json()
    assert data["source"] in ("ISRO Satellite", "MOSDAC")
    assert data["product"] == "INSAT-3D/3DR L1B Imager"
    assert "status" in data

# 8. Test MOSDAC precipitation API route (/api/data/mosdac/precipitation)
def test_mosdac_precipitation_endpoint():
    resp = client.get("/api/data/mosdac/precipitation?lat=17.68&lon=83.20")
    assert resp.status_code == 200
    data = resp.json()
    assert data["source"] in ("ISRO Satellite", "MOSDAC")
    assert data["product"] == "GSMaP ISRO Rain"
    assert "status" in data
    assert "provenance" in data

# 9. Test DataHarmonizer provenance reporting when MOSDAC is unconfigured vs configured
def test_data_harmonizer_mosdac_provenance():
    cube = harmonizer.get_convective_cube(data_mode="synthetic")
    prov = cube.get("channel_provenance", {})
    assert "nwp_cape" in prov
    assert "sat_tir1_k" in prov
    assert "sat_wv_k" in prov
    assert "SYNTHETIC" in prov["sat_tir1_k"] or "MOSDAC" in prov["sat_tir1_k"]
