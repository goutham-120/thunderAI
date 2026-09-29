"""
VAJRA-AI: Doppler Weather Radar (DWR) Test Suite
Tests NetCDF loader, polar-to-geographic preprocessor, spatial alignment diagnostics, and FastAPI endpoints.
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.isro_radar.radar_loader import radar_loader
from app.services.isro_radar.radar_preprocessor import radar_preprocessor
from app.services.isro_radar.radar_dataset import radar_dataset
from app.services.isro_radar.data_alignment import data_alignment

client = TestClient(app)

def test_radar_inventory():
    """Verify that radar dataset discovers all 20 NetCDF files in inventory."""
    inventory = radar_dataset.get_radar_inventory()
    assert len(inventory) == 20, f"Expected 20 radar files, found {len(inventory)}"
    first_item = inventory[0]
    assert "filename" in first_item
    assert "filepath" in first_item
    assert "timestamp_iso" in first_item
    assert first_item["filename"].startswith("RSCHR_28SEP2026_")

def test_radar_loader():
    """Verify NetCDF loader extracts variables, applies scaling, and reads station metadata correctly."""
    inventory = radar_dataset.get_radar_inventory()
    sample_file = inventory[0]["filepath"]
    radar_data = radar_loader.read_radar_file(sample_file)

    assert "RSCHR" in radar_data["station_name"]
    assert pytest.approx(radar_data["station_lat"], abs=0.01) == 25.2680
    assert pytest.approx(radar_data["station_lon"], abs=0.01) == 91.7332
    assert radar_data["dbz_calibrated"].shape == (720, 1633)
    assert radar_data["vel_calibrated"].shape == (720, 1633)

def test_radar_preprocessor():
    """Verify polar-to-cartesian georeferencing and grid resampling."""
    inventory = radar_dataset.get_radar_inventory()
    sample_file = inventory[0]["filepath"]
    radar_data = radar_loader.read_radar_file(sample_file)
    grid_res = radar_preprocessor.resample_to_grid(radar_data, grid_shape=(64, 64))

    assert grid_res["grid_dbz"].shape == (64, 64)
    assert grid_res["grid_vel"].shape == (64, 64)
    assert len(grid_res["bounds"]) == 4
    assert grid_res["max_dbz"] >= 0.0

def test_spatial_alignment():
    """Verify spatial overlap calculation logic for matching and non-overlapping ROIs."""
    # NATIONAL should have 100% spatial overlap
    aligned_res = data_alignment.match_satellite_and_radar_sequences(roi_name="NATIONAL")
    assert aligned_res["spatial_alignment"]["overlap_status"] == "SPATIALLY_ALIGNED"
    assert aligned_res["spatial_alignment"]["overlap_percentage"] > 90.0

    # AP_TELANGANA should have 0% spatial overlap
    unaligned_res = data_alignment.match_satellite_and_radar_sequences(roi_name="AP_TELANGANA")
    assert unaligned_res["spatial_alignment"]["overlap_status"] == "NO_SPATIAL_OVERLAP"
    assert unaligned_res["spatial_alignment"]["overlap_percentage"] == 0.0

def test_radar_api_status():
    """Verify GET /api/data/radar/status endpoint."""
    response = client.get("/api/data/radar/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "AVAILABLE"
    assert data["scans_count"] == 20
    assert "RSCHR" in data["station_name"]

def test_radar_api_files():
    """Verify GET /api/data/radar/files endpoint."""
    response = client.get("/api/data/radar/files")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["inventory"]) == 20

def test_radar_api_scan():
    """Verify GET /api/data/radar/scan endpoint."""
    response = client.get("/api/data/radar/scan?grid_rows=64&grid_cols=64")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "AVAILABLE"
    assert len(data["grid_dbz"]) == 64
    assert len(data["grid_dbz"][0]) == 64

def test_radar_api_alignment():
    """Verify GET /api/data/radar/alignment endpoint."""
    response = client.get("/api/data/radar/alignment?roi_name=NATIONAL")
    assert response.status_code == 200
    data = response.json()
    assert data["roi_name"] == "NATIONAL"
    assert data["spatial_alignment"]["overlap_status"] == "SPATIALLY_ALIGNED"
