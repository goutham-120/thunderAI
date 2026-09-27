"""
IITM / IMD Lightning Data Ingestion Test Suite (Step 4)
Tests credential verification, unconfigured fallback, deduplication, geographic filtering, 2D density binning, and tensor integration.
"""
import pytest
import numpy as np
import os
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.config import config
from app.services.lightning.client import LightningClient, lightning_client
from app.services.lightning.validation import validate_lightning_response
from app.services.lightning.processor import (
    process_lightning_strikes,
    deduplicate_strikes,
    filter_geographic_bounds,
    bin_strikes_to_density_grid
)
from app.services.data_harmonizer import harmonizer

client = TestClient(app)

# 1. Test missing credentials behavior
def test_missing_credentials_returns_unavailable():
    with patch.dict(os.environ, {"LIGHTNING_USERNAME": "", "LIGHTNING_PASSWORD": "", "LIGHTNING_API_URL": ""}):
        light_cli = LightningClient()
        assert not light_cli.is_configured()
        
        status = light_cli.get_status()
        assert status["status"] == "UNAVAILABLE"
        assert status["reason"] == "LIGHTNING_ACCESS_NOT_CONFIGURED"
        assert status["provenance"] == "NONE"
        
        res = light_cli.fetch_lightning_strikes(latitude=17.68, longitude=83.20)
        assert res["status"] == "UNAVAILABLE"
        assert res["reason"] == "LIGHTNING_ACCESS_NOT_CONFIGURED"
        assert res["provenance"] == "NONE"
        assert res["data"] is None

# 2. Test network failure / HTTP error handling
def test_network_failure_handling():
    with patch.dict(os.environ, {"LIGHTNING_USERNAME": "user", "LIGHTNING_PASSWORD": "pass", "LIGHTNING_API_URL": "http://127.0.0.1:8899/invalid"}):
        light_cli = LightningClient()
        assert light_cli.is_configured()
        
        with patch("urllib.request.urlopen", side_effect=Exception("Connection refused")):
            res = light_cli.fetch_lightning_strikes(17.68, 83.20)
            assert res["status"] == "UNAVAILABLE"
            assert res["provenance"] == "NONE"
            assert "Connection refused" in res["reason"]

# 3. Test malformed payload validation
def test_malformed_lightning_validation():
    # Non-dict
    is_valid, err = validate_lightning_response("invalid string") # type: ignore
    assert not is_valid
    assert "dictionary" in err

    # Error status code
    is_valid, err = validate_lightning_response({"status_code": 500, "error": "Internal Server Error"})
    assert not is_valid
    assert "500" in err

# 4. Test duplicate strike removal
def test_duplicate_strikes_deduplication():
    strikes = [
        {"latitude": 17.500, "longitude": 78.500, "timestamp": "2026-09-27T12:00:00Z"},
        {"latitude": 17.500, "longitude": 78.500, "timestamp": "2026-09-27T12:00:00Z"}, # duplicate
        {"latitude": 18.200, "longitude": 79.100, "timestamp": "2026-09-27T12:00:05Z"}
    ]
    unique = deduplicate_strikes(strikes)
    assert len(unique) == 2

# 5. Test geographic bounds filtering
def test_geographic_bounds_filtering():
    strikes = [
        {"latitude": 17.50, "longitude": 78.50}, # In bounds (15.5-19.5, 76.5-81.5)
        {"latitude": 12.00, "longitude": 77.00}, # Out of bounds (Bengaluru)
        {"latitude": 28.60, "longitude": 77.20}  # Out of bounds (Delhi)
    ]
    filtered = filter_geographic_bounds(strikes, config.GRID_BOUNDS)
    assert len(filtered) == 1
    assert filtered[0]["latitude"] == 17.50

# 6. Test spatial point-to-density raster binning
def test_spatial_density_binning_grid_shape():
    strikes = [
        {"latitude": 17.40, "longitude": 78.48},
        {"latitude": 17.41, "longitude": 78.49},
        {"latitude": 18.20, "longitude": 80.10}
    ]
    grid = bin_strikes_to_density_grid(strikes, config.GRID_BOUNDS, rows=64, cols=64)
    assert grid.shape == (64, 64)
    assert np.sum(grid) == 3.0

# 7. Test API routes
def test_lightning_status_endpoint():
    resp = client.get("/api/data/lightning/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["source"] == "IITM / IMD Damini Lightning Network"
    assert "status" in data

def test_lightning_strikes_endpoint():
    resp = client.get("/api/data/lightning/strikes?lat=17.68&lon=83.20")
    assert resp.status_code == 200
    data = resp.json()
    assert data["source"] == "IITM / IMD Damini Lightning Network"
    assert "status" in data

# 8. Test DataHarmonizer tensor integration & provenance
def test_data_harmonizer_lightning_integration():
    cube = harmonizer.get_convective_cube(data_mode="synthetic")
    prov = cube.get("channel_provenance", {})
    assert "lightning_density" in prov
    assert "SYNTHETIC" in prov["lightning_density"] or "REAL" in prov["lightning_density"]
