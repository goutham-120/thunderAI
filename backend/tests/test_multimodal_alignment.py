"""
VAJRA-AI: Multimodal Alignment Unit Test Suite
Tests geographic bounding box overlap calculation, timestamp parsing, and time tolerance matching.
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.isro_radar.data_alignment import data_alignment, RADAR_FOOTPRINT
from app.services.insat_3ds_processor import ROI_BOUNDS

def test_radar_footprint_bounds():
    """Verify Cherrapunji DWR footprint bounds coordinates."""
    assert RADAR_FOOTPRINT["min_lat"] == 23.11
    assert RADAR_FOOTPRINT["max_lat"] == 27.43
    assert RADAR_FOOTPRINT["min_lon"] == 89.35
    assert RADAR_FOOTPRINT["max_lon"] == 94.12

def test_evaluate_spatial_overlap_matching():
    """Verify NATIONAL and NORTHEAST_MEGHALAYA report spatial alignment."""
    res_nat = data_alignment.evaluate_spatial_overlap("NATIONAL")
    assert res_nat["overlap_status"] == "SPATIALLY_ALIGNED"
    assert res_nat["overlap_percentage"] == 100.0

    res_mgh = data_alignment.evaluate_spatial_overlap("NORTHEAST_MEGHALAYA")
    assert res_mgh["overlap_status"] == "SPATIALLY_ALIGNED"
    assert res_mgh["overlap_percentage"] == 58.2

def test_evaluate_spatial_overlap_non_matching():
    """Verify AP_TELANGANA reports NO_SPATIAL_OVERLAP."""
    res_ap = data_alignment.evaluate_spatial_overlap("AP_TELANGANA")
    assert res_ap["overlap_status"] == "NO_SPATIAL_OVERLAP"
    assert res_ap["overlap_percentage"] == 0.0

def test_match_sequences_disjoint():
    """Verify zero matched pairs on temporally disjoint dataset."""
    match_res = data_alignment.match_satellite_and_radar_sequences(roi_name="NATIONAL", time_tolerance_min=15.0)
    assert match_res["matched_pairs_count"] == 0
    assert match_res["total_satellite_scans"] == 9
    assert match_res["total_radar_scans"] == 20
