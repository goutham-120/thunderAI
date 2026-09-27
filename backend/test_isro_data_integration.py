"""
VAJRA-AI ISRO Data Integration Fix Test Suite
Tests:
1. INSAT-3D/3DR/3DS Imager (TIR1, TIR2, WV) product selection & 64x64 regridding
2. INSAT-3D Sounder profile parsing & derived index handling
3. ISRO Doppler Weather Radar (DWR) volume scan (dBZ & Radial Velocity) parsing & regridding
4. Geographic range validation (validate_radar_coverage) for VSKP, MCP, HYD DWR sites vs target bounds
5. Truthful timestamp provenance classification (REAL < 24h vs ARCHIVE >= 24h)
6. Multimodal DataHarmonizer provenance propagation
"""
import pytest
import numpy as np
import os
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

from app.config import config
from app.services.mosdac.client import MOSDACClient, mosdac_client
from app.services.mosdac.validation import validate_mosdac_response
from app.services.mosdac.parser import (
    parse_insat_observations,
    parse_insat_sounder_data,
    parse_gsmap_data,
    check_timestamp_provenance as check_mosdac_provenance
)
from app.services.isro_radar.client import ISRORadarClient, isro_radar_client, KNOWN_RADAR_SITES
from app.services.isro_radar.validation import validate_radar_response, validate_radar_coverage
from app.services.isro_radar.parser import (
    parse_radar_volume_scan,
    check_timestamp_provenance as check_radar_provenance
)
from app.services.data_harmonizer import harmonizer


# 1. Test INSAT-3D/3DR Imager channels (TIR1, TIR2, WV)
def test_insat_imager_multichannel_parsing():
    now_iso = datetime.now(timezone.utc).isoformat()
    sample_payload = {
        "timestamp": now_iso,
        "data": {
            "tir1_temp_k": [[220.0, 230.0], [240.0, 250.0]],
            "tir2_temp_k": [[218.8, 228.8], [238.8, 248.8]],
            "water_vapor_k": [[235.0, 240.0], [245.0, 250.0]]
        }
    }
    
    is_valid, err = validate_mosdac_response(sample_payload)
    assert is_valid, f"Payload validation failed: {err}"
    
    parsed = parse_insat_observations(sample_payload, target_bounds=config.GRID_BOUNDS, target_rows=64, target_cols=64)
    assert parsed["source"] in ("ISRO Satellite", "MOSDAC")
    assert "INSAT-3D" in parsed["product"]
    assert parsed["provenance"] == "REAL"
    assert parsed["tir1_grid"].shape == (64, 64)
    assert parsed["tir2_grid"].shape == (64, 64)
    assert parsed["wv_grid"].shape == (64, 64)
    assert parsed["mean_tir1_temp_k"] > 200.0
    assert parsed["mean_tir2_temp_k"] > 200.0
    assert parsed["mean_water_vapor_k"] > 200.0


# 2. Test INSAT-3D Sounder profiles
def test_insat_sounder_profile_parsing():
    sample_payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {
            "tir1_temp_k": 275.0,
            "sounder_temp_profile": {
                "temp_profile": [290.0, 278.0, 252.0, 225.0],
                "moisture_profile": [80.0, 60.0, 35.0, 15.0],
                "derived_cape": 2450.0,
                "lifted_index": -5.5
            }
        }
    }
    
    sounder = parse_insat_sounder_data(sample_payload, target_bounds=config.GRID_BOUNDS)
    assert sounder["status"] == "AVAILABLE"
    assert sounder["derived_cape_jkg"] == 2450.0
    assert sounder["lifted_index"] == -5.5
    assert len(sounder["temp_profile_k"]) == 4


# 3. Test ISRO DWR volume scan parsing
def test_isro_dwr_volume_scan_parsing():
    now_iso = datetime.now(timezone.utc).isoformat()
    sample_scan = {
        "timestamp": now_iso,
        "data": {
            "radar_site": "HYDERABAD_DWR",
            "site_lat": 17.38,
            "site_lon": 78.48,
            "reflectivity_dbz": [[30.0, 40.0], [50.0, 60.0]],
            "radial_velocity_ms": [[-15.0, -5.0], [10.0, 20.0]]
        }
    }
    
    is_valid, err = validate_radar_response(sample_scan)
    assert is_valid, f"Radar payload validation failed: {err}"
    
    parsed = parse_radar_volume_scan(sample_scan, target_bounds=config.GRID_BOUNDS, target_rows=64, target_cols=64)
    assert parsed["source"] == "ISRO DWR"
    assert parsed["radar_site"] == "HYDERABAD_DWR"
    assert parsed["provenance"] == "REAL"
    assert parsed["max_dbz"] == 60.0
    assert parsed["dbz_grid"].shape == (64, 64)
    assert parsed["velocity_grid"].shape == (64, 64)
    assert parsed["coverage_is_valid"] is True


# 4. Test Radar Geographic Coverage Validation
def test_validate_radar_coverage_sites():
    # Hyderabad DWR (center of target grid)
    is_cov, dist, desc = validate_radar_coverage(17.38, 78.48, max_range_km=250.0, target_bounds=config.GRID_BOUNDS)
    assert is_cov is True
    assert dist < 100.0
    assert "Full Coverage" in desc

    # Machilipatnam DWR (eastern sector inside target grid)
    is_cov, dist, desc = validate_radar_coverage(16.20, 81.15, max_range_km=250.0, target_bounds=config.GRID_BOUNDS)
    assert is_cov is True

    # Visakhapatnam DWR (coastal AP, ~185 km east of 81.5E target bound)
    is_cov, dist, desc = validate_radar_coverage(17.72, 83.25, max_range_km=250.0, target_bounds=config.GRID_BOUNDS)
    assert is_cov is True
    assert "Partial Coverage" in desc

    # Out of range site (e.g. New Delhi DWR at 28.55N, 77.08E)
    is_cov, dist, desc = validate_radar_coverage(28.55, 77.08, max_range_km=250.0, target_bounds=config.GRID_BOUNDS)
    assert is_cov is False
    assert "Out of Range" in desc


# 5. Test Timestamp Provenance Classification (REAL < 24h vs ARCHIVE >= 24h)
def test_timestamp_provenance_tagging():
    # Live timestamp (2 hours old)
    live_dt = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    assert check_mosdac_provenance(live_dt) == "REAL"
    assert check_radar_provenance(live_dt) == "REAL"

    # Historical timestamp (48 hours old)
    hist_dt = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
    assert check_mosdac_provenance(hist_dt) == "ARCHIVE"
    assert check_radar_provenance(hist_dt) == "ARCHIVE"

    # Empty or unparseable timestamp
    assert check_mosdac_provenance(None) == "ARCHIVE"
    assert check_radar_provenance("invalid_date") == "ARCHIVE"


# 6. Test DataHarmonizer Multimodal Integration with Real Mock Payload
def test_harmonizer_provenance_integration():
    sample_insat = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {
            "tir1_temp_k": 225.0,
            "water_vapor_k": 240.0
        }
    }
    
    sample_radar = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
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
        
        cube = harmonizer.get_convective_cube(data_mode="synthetic")
        prov = cube.get("channel_provenance", {})
        
        assert "REAL" in prov.get("sat_tir1_k", "")
        assert "REAL" in prov.get("sat_wv_k", "")
        assert "REAL" in prov.get("radar_dbz", "")
        assert "REAL" in prov.get("radial_velocity", "")
