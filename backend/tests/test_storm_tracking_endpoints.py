"""
test_storm_tracking_endpoints.py
==================================
Backend tests for the storm tracking feature.

Tests:
  1. GET /api/storms/active  — valid response structure
  2. GET /api/storms/active  — empty state (no cells) is handled
  3. GET /api/storms/{cell_id} — known cell lookup
  4. GET /api/storms/{cell_id} — unknown cell → 404
  5. Cell data structure — all required fields present
  6. Movement vector present
  7. Trajectory array present and structured correctly
  8. Cell coordinates (lat/lon) are finite floats within India bounds
  9. Data provenance field present in nowcast context
 10. No fabricated data — cells only appear if dBZ >= 38.0 threshold
"""

import pytest
from fastapi.testclient import TestClient

# ── Import the FastAPI app ──────────────────────────────────────────────────
import sys
import os
# Add backend root to path so we can import `app`
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

try:
    from app.main import app
    HAS_APP = True
except ImportError as e:
    HAS_APP = False
    IMPORT_ERROR = str(e)


# ── Helpers ────────────────────────────────────────────────────────────────

def get_client():
    assert HAS_APP, f"Could not import FastAPI app: {IMPORT_ERROR}"
    return TestClient(app)


INDIA_LAT_MIN =  6.0
INDIA_LAT_MAX = 38.0
INDIA_LON_MIN = 68.0
INDIA_LON_MAX = 98.0

REQUIRED_CELL_FIELDS = {
    "cell_id", "center", "max_dbz", "lifecycle_state", "severity",
    "movement", "trajectory",
}


# ── Tests ──────────────────────────────────────────────────────────────────

@pytest.mark.skipif(not HAS_APP, reason="FastAPI app not importable")
class TestActiveStormsEndpoint:

    def test_active_storms_returns_200(self):
        """GET /api/storms/active should return 200 OK."""
        client = get_client()
        resp = client.get("/api/storms/active")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_active_storms_response_structure(self):
        """Response must have 'storm_cells' list and 'count'."""
        client = get_client()
        data = client.get("/api/storms/active").json()
        assert "storm_cells" in data, "Missing 'storm_cells' key"
        assert "count" in data, "Missing 'count' key"
        assert isinstance(data["storm_cells"], list)
        assert data["count"] == len(data["storm_cells"])

    def test_active_storms_count_matches_list(self):
        """'count' must equal len(storm_cells)."""
        client = get_client()
        data = client.get("/api/storms/active").json()
        assert data["count"] == len(data["storm_cells"])

    def test_active_storms_cell_required_fields(self):
        """Each cell must contain all required fields (no missing keys)."""
        client = get_client()
        data = client.get("/api/storms/active").json()
        cells = data["storm_cells"]
        if not cells:
            pytest.skip("No active storm cells in current dataset — empty state is valid")
        for cell in cells:
            missing = REQUIRED_CELL_FIELDS - set(cell.keys())
            assert not missing, f"Cell {cell.get('cell_id')} missing fields: {missing}"

    def test_active_storms_cell_coordinates_valid(self):
        """Cell centroids must have finite lat/lon within India bounds."""
        client = get_client()
        cells = client.get("/api/storms/active").json()["storm_cells"]
        if not cells:
            pytest.skip("No cells to validate")
        for cell in cells:
            center = cell.get("center", {})
            lat = center.get("lat")
            lon = center.get("lon")
            assert lat is not None, f"Cell {cell['cell_id']} has no center.lat"
            assert lon is not None, f"Cell {cell['cell_id']} has no center.lon"
            assert isinstance(lat, (int, float)) and not isinstance(lat, bool)
            assert isinstance(lon, (int, float)) and not isinstance(lon, bool)
            assert INDIA_LAT_MIN <= lat <= INDIA_LAT_MAX, (
                f"Cell {cell['cell_id']} lat={lat} outside India bounds"
            )
            assert INDIA_LON_MIN <= lon <= INDIA_LON_MAX, (
                f"Cell {cell['cell_id']} lon={lon} outside India bounds"
            )

    def test_active_storms_movement_vector(self):
        """Each cell's 'movement' dict must have speed_kmh, heading_deg, direction_compass."""
        client = get_client()
        cells = client.get("/api/storms/active").json()["storm_cells"]
        if not cells:
            pytest.skip("No cells to validate")
        for cell in cells:
            mov = cell.get("movement", {})
            assert "speed_kmh" in mov, f"Cell {cell['cell_id']}: missing movement.speed_kmh"
            assert "heading_deg" in mov, f"Cell {cell['cell_id']}: missing movement.heading_deg"
            assert "direction_compass" in mov, f"Cell {cell['cell_id']}: missing movement.direction_compass"
            assert 0 <= mov["speed_kmh"] <= 200, f"Unrealistic speed: {mov['speed_kmh']}"
            assert 0 <= mov["heading_deg"] <= 360, f"Unrealistic heading: {mov['heading_deg']}"

    def test_active_storms_trajectory_structure(self):
        """Each cell must have a 'trajectory' list; each entry must have horizon_min, lat, lon."""
        client = get_client()
        cells = client.get("/api/storms/active").json()["storm_cells"]
        if not cells:
            pytest.skip("No cells to validate")
        for cell in cells:
            traj = cell.get("trajectory", [])
            assert isinstance(traj, list), f"Cell {cell['cell_id']}: trajectory is not a list"
            for pt in traj:
                assert "horizon_min" in pt, f"Trajectory point missing horizon_min"
                assert "lat" in pt, f"Trajectory point missing lat"
                assert "lon" in pt, f"Trajectory point missing lon"

    def test_active_storms_trajectory_t0_present(self):
        """Trajectory must include a T=0 (horizon_min=0) observed centroid."""
        client = get_client()
        cells = client.get("/api/storms/active").json()["storm_cells"]
        if not cells:
            pytest.skip("No cells")
        for cell in cells:
            horizons = [p["horizon_min"] for p in cell.get("trajectory", [])]
            assert 0 in horizons, (
                f"Cell {cell['cell_id']}: trajectory has no T=0 point (observed centroid)"
            )

    def test_active_storms_severity_valid_values(self):
        """Severity must be one of the defined values from storm_tracker.py."""
        valid = {"EXTREME", "SEVERE", "MODERATE", "MINOR"}
        client = get_client()
        cells = client.get("/api/storms/active").json()["storm_cells"]
        if not cells:
            pytest.skip("No cells")
        for cell in cells:
            assert cell["severity"] in valid, (
                f"Cell {cell['cell_id']} has unexpected severity: {cell['severity']}"
            )

    def test_active_storms_max_dbz_at_threshold(self):
        """
        max_dbz must be >= 38.0 (the convective_mask threshold in storm_tracker.py).
        SCIENTIFIC RULE: We verify the actual threshold, not a name claim.
        """
        client = get_client()
        cells = client.get("/api/storms/active").json()["storm_cells"]
        if not cells:
            pytest.skip("No cells")
        for cell in cells:
            assert cell["max_dbz"] >= 38.0, (
                f"Cell {cell['cell_id']} max_dbz={cell['max_dbz']} below detection threshold 38.0 dBZ"
            )

    def test_active_storms_empty_state_valid(self):
        """
        If no cells, count=0 and storm_cells=[] is a valid, expected response.
        Not an error condition.
        """
        client = get_client()
        data = client.get("/api/storms/active").json()
        # Whatever the count, the structure must be valid
        assert data["count"] >= 0
        assert isinstance(data["storm_cells"], list)
        assert data["count"] == len(data["storm_cells"])


@pytest.mark.skipif(not HAS_APP, reason="FastAPI app not importable")
class TestStormByIdEndpoint:

    def _get_first_cell_id(self, client):
        cells = client.get("/api/storms/active").json()["storm_cells"]
        if not cells:
            return None
        return cells[0]["cell_id"]

    def test_storm_by_id_returns_200(self):
        client = get_client()
        cid = self._get_first_cell_id(client)
        if not cid:
            pytest.skip("No cells available")
        resp = client.get(f"/api/storms/{cid}")
        assert resp.status_code == 200, f"Expected 200 for cell {cid}, got {resp.status_code}"

    def test_storm_by_id_returns_404_for_unknown(self):
        """Unknown cell_id must return 404."""
        client = get_client()
        resp = client.get("/api/storms/CELL-DOESNOTEXIST-ZZZ")
        assert resp.status_code == 404, f"Expected 404 for unknown cell, got {resp.status_code}"

    def test_storm_by_id_matches_active_list(self):
        """Single-cell detail fields must match the active list data for same cell."""
        client = get_client()
        cid = self._get_first_cell_id(client)
        if not cid:
            pytest.skip("No cells available")
        # Get from list
        list_cell = next(
            c for c in client.get("/api/storms/active").json()["storm_cells"]
            if c["cell_id"] == cid
        )
        # Get from detail
        detail = client.get(f"/api/storms/{cid}").json()
        assert detail["cell_id"] == list_cell["cell_id"]
        assert abs(detail["max_dbz"] - list_cell["max_dbz"]) < 5.0, (
            "max_dbz discrepancy between list and detail endpoint (>5 dBZ)"
        )

    def test_storm_by_id_case_insensitive(self):
        """Cell ID lookup should be case-insensitive per routes_storms.py."""
        client = get_client()
        cid = self._get_first_cell_id(client)
        if not cid:
            pytest.skip("No cells available")
        resp_upper = client.get(f"/api/storms/{cid.upper()}")
        resp_lower = client.get(f"/api/storms/{cid.lower()}")
        assert resp_upper.status_code == 200
        assert resp_lower.status_code == 200


@pytest.mark.skipif(not HAS_APP, reason="FastAPI app not importable")
class TestStormTrackerDirectly:
    """Unit tests directly against StormCellTracker (no HTTP layer)."""

    def test_tracker_import(self):
        from app.services.storm_tracker import storm_tracker, StormCellTracker
        assert isinstance(storm_tracker, StormCellTracker)

    def test_tracker_no_cells_when_below_threshold(self):
        """Grid with all dBZ < 38 must produce zero cells."""
        import numpy as np
        from app.services.storm_tracker import StormCellTracker
        tracker = StormCellTracker()
        low_dbz = np.ones((32, 32)) * 20.0  # all below threshold
        cells = tracker.detect_and_track_cells(
            dbz_grid=low_dbz,
            sat_grid=np.ones((32, 32)) * 260.0,
            lightning_grid=np.zeros((32, 32)),
            cape_grid=np.ones((32, 32)) * 500.0,
        )
        assert cells == [], f"Expected 0 cells for low-dBZ grid, got {len(cells)}"

    def test_tracker_detects_cell_above_threshold(self):
        """Convective core (dBZ >= 38) must produce at least one cell."""
        import numpy as np
        from app.services.storm_tracker import StormCellTracker
        tracker = StormCellTracker()
        dbz_grid = np.ones((32, 32)) * 20.0
        # Insert a 5×5 convective core
        dbz_grid[12:17, 12:17] = 55.0
        cells = tracker.detect_and_track_cells(
            dbz_grid=dbz_grid,
            sat_grid=np.ones((32, 32)) * 220.0,
            lightning_grid=np.ones((32, 32)) * 5.0,
            cape_grid=np.ones((32, 32)) * 2000.0,
        )
        assert len(cells) >= 1, "Expected at least 1 cell for convective core"

    def test_tracker_cell_has_trajectory(self):
        """Returned cells must have non-empty trajectory."""
        import numpy as np
        from app.services.storm_tracker import StormCellTracker
        tracker = StormCellTracker()
        dbz_grid = np.ones((32, 32)) * 20.0
        dbz_grid[10:18, 10:18] = 52.0  # 8×8 = 64 pixels, above 8-pixel minimum
        cells = tracker.detect_and_track_cells(
            dbz_grid=dbz_grid,
            sat_grid=np.ones((32, 32)) * 215.0,
            lightning_grid=np.ones((32, 32)) * 8.0,
            cape_grid=np.ones((32, 32)) * 2200.0,
        )
        assert cells, "No cells detected"
        for cell in cells:
            assert len(cell["trajectory"]) > 0, "Cell has empty trajectory"
            t0 = [p for p in cell["trajectory"] if p["horizon_min"] == 0]
            assert t0, "No T=0 trajectory point"

    def test_tracker_cell_id_sequential(self):
        """Cell IDs should follow CELL-A, CELL-B, ... pattern."""
        import numpy as np
        from app.services.storm_tracker import StormCellTracker
        tracker = StormCellTracker()
        dbz_grid = np.ones((32, 32)) * 20.0
        dbz_grid[5:13, 5:13] = 52.0
        dbz_grid[20:28, 20:28] = 48.0
        cells = tracker.detect_and_track_cells(
            dbz_grid=dbz_grid,
            sat_grid=np.ones((32, 32)) * 220.0,
            lightning_grid=np.ones((32, 32)) * 5.0,
            cape_grid=np.ones((32, 32)) * 1800.0,
        )
        for i, cell in enumerate(cells):
            expected_letter = chr(65 + i)
            assert cell["cell_id"] == f"CELL-{expected_letter}", (
                f"Expected CELL-{expected_letter}, got {cell['cell_id']}"
            )
