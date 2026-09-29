"""
ISRO Doppler Weather Radar (DWR) Preprocessor & Georeferencing Engine
Converts polar radar sweeps (azimuth, range) to geographic coordinates (lat, lon) using great-circle formulas,
performs resampling to target regular grids (64x64 or 128x128), and calculates exact spatial bounding boxes.
"""
import logging
from typing import Dict, Any, Tuple, Optional
import numpy as np

logger = logging.getLogger("VAJRA-AI.RadarPreprocessor")

class RadarPreprocessor:
    def georeference_sweep(self, radar_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculates 2D geographic (latitude, longitude) matrices for polar rays and range bins.
        """
        lat0 = radar_data["station_lat"]
        lon0 = radar_data["station_lon"]
        azimuths = radar_data["azimuths"] # degrees
        ranges_m = radar_data["ranges_m"] # meters

        R_earth = 6371000.0 # Earth radius in meters

        az_rad = np.radians(azimuths)[:, np.newaxis] # [n_rays, 1]
        r_m = ranges_m[np.newaxis, :] # [1, n_bins]

        lat0_rad = np.radians(lat0)
        lon0_rad = np.radians(lon0)
        d_R = r_m / R_earth

        # Great-circle formulas
        lats_rad = np.arcsin(
            np.sin(lat0_rad) * np.cos(d_R) +
            np.cos(lat0_rad) * np.sin(d_R) * np.cos(az_rad)
        )
        lons_rad = lon0_rad + np.arctan2(
            np.sin(az_rad) * np.sin(d_R) * np.cos(lat0_rad),
            np.cos(d_R) - np.sin(lat0_rad) * np.sin(lats_rad)
        )

        lats_deg = np.degrees(lats_rad)
        lons_deg = np.degrees(lons_rad)

        bounds = [
            float(lats_deg.min()),
            float(lons_deg.min()),
            float(lats_deg.max()),
            float(lons_deg.max())
        ]

        return {
            "lats_deg": lats_deg,
            "lons_deg": lons_deg,
            "bounds": bounds
        }

    def resample_to_grid(
        self,
        radar_data: Dict[str, Any],
        target_bounds: Optional[Tuple[float, float, float, float]] = None,
        grid_shape: Tuple[int, int] = (64, 64)
    ) -> Dict[str, Any]:
        """
        Resamples polar DBZ and VEL measurements onto a regular geographic grid [grid_shape].
        """
        geo = self.georeference_sweep(radar_data)
        lats = geo["lats_deg"].flatten()
        lons = geo["lons_deg"].flatten()

        dbz_flat = radar_data["dbz_calibrated"].flatten()
        vel_flat = radar_data["vel_calibrated"].flatten() if radar_data["vel_calibrated"] is not None else None

        # Filter NaNs
        valid_mask = ~np.isnan(dbz_flat)
        lats_v = lats[valid_mask]
        lons_v = lons[valid_mask]
        dbz_v = dbz_flat[valid_mask]

        b = target_bounds or geo["bounds"] # [min_lat, min_lon, max_lat, max_lon]
        target_lats = np.linspace(b[0], b[2], grid_shape[0])
        target_lons = np.linspace(b[1], b[3], grid_shape[1])

        grid_dbz = np.zeros(grid_shape, dtype=np.float32)
        grid_vel = np.zeros(grid_shape, dtype=np.float32)

        if len(lats_v) > 0:
            # Grid binning using histogram2d
            lat_edges = np.linspace(b[0], b[2], grid_shape[0] + 1)
            lon_edges = np.linspace(b[1], b[3], grid_shape[1] + 1)

            counts, _, _ = np.histogram2d(lats_v, lons_v, bins=[lat_edges, lon_edges])
            sums_dbz, _, _ = np.histogram2d(lats_v, lons_v, bins=[lat_edges, lon_edges], weights=dbz_v)

            with np.errstate(divide='ignore', invalid='ignore'):
                grid_dbz = np.where(counts > 0, sums_dbz / counts, 0.0)

            if vel_flat is not None:
                v_valid = ~np.isnan(vel_flat)
                sums_vel, _, _ = np.histogram2d(lats[v_valid], lons[v_valid], bins=[lat_edges, lon_edges], weights=vel_flat[v_valid])
                counts_vel, _, _ = np.histogram2d(lats[v_valid], lons[v_valid], bins=[lat_edges, lon_edges])
                with np.errstate(divide='ignore', invalid='ignore'):
                    grid_vel = np.where(counts_vel > 0, sums_vel / counts_vel, 0.0)

        return {
            "filename": radar_data["filename"],
            "timestamp_iso": radar_data["timestamp_iso"],
            "station_name": radar_data["station_name"],
            "bounds": b,
            "target_lats": target_lats.tolist(),
            "target_lons": target_lons.tolist(),
            "grid_dbz": grid_dbz,
            "grid_vel": grid_vel,
            "max_dbz": float(np.max(grid_dbz)) if grid_dbz.size > 0 else 0.0,
            "max_vel": float(np.max(grid_vel)) if grid_vel.size > 0 else 0.0
        }

radar_preprocessor = RadarPreprocessor()
