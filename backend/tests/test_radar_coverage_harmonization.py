"""
VAJRA-AI: Radar Spatial Coverage & Data Harmonization Test Suite
Tests spatial coverage validation, out-of-coverage handling, synthetic isolation, and empty-state classification.
"""
import sys
import os
import numpy as np
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config import config
from app.services.isro_radar.client import isro_radar_client
from app.services.isro_radar.validation import validate_radar_coverage
from app.services.data_harmonizer import DataHarmonizer
from app.services.forecast_engine import ForecastEngine
from app.services.storm_tracker import storm_tracker


def test_cherrapunji_out_of_coverage_validation():
    """Verify Cherrapunji DWR (25.2680N, 91.7332E) is correctly identified as OUT_OF_COVERAGE for Telangana grid bounds."""
    is_cov, dist_km, cov_desc = validate_radar_coverage(
        site_lat=25.2680,
        site_lon=91.7332,
        max_range_km=240.0,
        target_bounds=config.GRID_BOUNDS
    )
    assert is_cov is False, "Cherrapunji radar must not be marked as covering Telangana grid bounds"
    assert "Out of Range" in cov_desc
    assert dist_km > 500.0


def test_radar_client_fetch_out_of_coverage():
    """Verify ISRORadarClient.fetch_radar_observations returns OUT_OF_COVERAGE for Cherrapunji files."""
    obs = isro_radar_client.fetch_radar_observations()
    assert obs["status"] == "OUT_OF_COVERAGE"
    assert obs["coverage_valid"] is False
    assert obs["data"]["dbz_grid"] is None


def test_real_data_mode_no_synthetic_leakage():
    """Verify real data mode does not contaminate real channels with synthetic 55 dBZ storm cores when radar is out of coverage."""
    dh = DataHarmonizer()
    cube = dh.get_convective_cube(data_mode="real")
    tensor_4d = cube["tensor"]

    # In REAL mode with Cherrapunji radar (out of coverage), radar_dbz (channel 0) must be 0.0 (no false synthetic storm core)
    max_dbz = np.max(tensor_4d[:, :, :, 0])
    assert max_dbz == 0.0, f"Expected 0.0 max dBZ for out-of-coverage radar in REAL mode, got {max_dbz}"
    assert "OUT_OF_COVERAGE" in cube["channel_provenance"]["radar_dbz"]


def test_synthetic_data_mode_convective_generation():
    """Verify synthetic mode generates requested convective storm core for testing/demo mode."""
    dh = DataHarmonizer()
    cube = dh.get_convective_cube(data_mode="synthetic")
    tensor_4d = cube["tensor"]

    max_dbz = np.max(tensor_4d[:, :, :, 0])
    assert max_dbz >= 45.0, f"Expected synthetic storm core >= 45 dBZ, got {max_dbz}"
    assert cube["data_mode"] == "synthetic"
    assert cube["channel_provenance"]["radar_dbz"] == "SYNTHETIC"


def test_valid_zero_cells_classification():
    """Verify valid radar data below 35 dBZ threshold returns 0 storm cells without error."""
    sub_threshold_grid = np.full((64, 64), 22.5, dtype=np.float32)
    sat_grid = np.full((64, 64), 280.0, dtype=np.float32)
    lightning_grid = np.zeros((64, 64), dtype=np.float32)
    cape_grid = np.full((64, 64), 1500.0, dtype=np.float32)

    cells = storm_tracker.detect_and_track_cells(
        dbz_grid=sub_threshold_grid,
        sat_grid=sat_grid,
        lightning_grid=lightning_grid,
        cape_grid=cape_grid
    )

    assert len(cells) == 0, "Sub-threshold radar input must produce 0 storm cells"


def test_forecast_engine_nowcast_payload_coverage():
    """Verify ForecastEngine exposes radar_status and coverage validation in nowcast payload."""
    fe = ForecastEngine()
    res = fe.get_complete_nowcast(data_mode="real")

    assert "radar_status" in res
    assert "radar_coverage_valid" in res
    assert res["radar_status"] == "OUT_OF_COVERAGE"
    assert res["radar_coverage_valid"] is False
    assert len(res["storm_cells"]) == 0
