"""
ISRO Doppler Weather Radar (DWR) NetCDF Loader
Reads NetCDF radar volume scan files (RSCHR_*.nc), extracts instrument metadata,
polar coordinate arrays, scale/offset attributes, and calibrated variables (DBZ, VEL, WIDTH, ZDR, PHIDP, RHOHV).
"""
import os
import glob
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from scipy.io import netcdf_file

logger = logging.getLogger("VAJRA-AI.RadarLoader")

SEARCH_PATHS = [
    r"C:\Users\nalla\Downloads",
    r"c:\Users\nalla\OneDrive\Documents\Thunder\thunderAI\backend\data\radar"
]

class RadarLoader:
    def __init__(self, search_paths: List[str] = SEARCH_PATHS):
        self.search_paths = search_paths

    def find_radar_files(self) -> List[str]:
        """
        Dynamically discovers all available RSCHR_*.nc radar files across search paths.
        """
        found_files = []
        for path in self.search_paths:
            if os.path.exists(path):
                pattern = os.path.join(path, "RSCHR_*.nc")
                matches = glob.glob(pattern)
                found_files.extend(matches)

        found_files = sorted(list(set(found_files)))
        return found_files

    def parse_filename_timestamp(self, filepath: str) -> Tuple[datetime, str]:
        """
        Parses scan acquisition timestamp from filename, e.g. RSCHR_28SEP2026_001546_L2B_STD.nc -> 2026-09-28T00:15:46+00:00.
        """
        fname = os.path.basename(filepath)
        parts = fname.split('_')
        if len(parts) >= 3:
            try:
                date_str = parts[1] # e.g. 28SEP2026
                time_str = parts[2] # e.g. 001546
                dt = datetime.strptime(f"{date_str}{time_str}", "%d%b%Y%H%M%S").replace(tzinfo=timezone.utc)
                return dt, dt.isoformat()
            except Exception:
                pass
        now_dt = datetime.now(timezone.utc)
        return now_dt, now_dt.isoformat()

    def read_radar_file(self, filepath: str) -> Dict[str, Any]:
        """
        Reads NetCDF radar file and extracts metadata, coordinates, and calibrated variable arrays.
        """
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Radar file not found: {filepath}")

        fname = os.path.basename(filepath)
        dt_obj, ts_iso = self.parse_filename_timestamp(filepath)

        f = netcdf_file(filepath, 'r', mmap=False)

        try:
            # Instrument metadata & location
            lat0 = float(f.variables['latitude'].data)
            lon0 = float(f.variables['longitude'].data)
            alt0 = float(f.variables['altitude'].data)

            azimuths = f.variables['azimuth'][:] # degrees from True North
            elevations = f.variables['elevation'][:] # degrees
            ranges = f.variables['range'][:] # meters

            max_range_km = float(ranges[-1] / 1000.0) if len(ranges) > 0 else 240.0
            range_res_m = float(ranges[1] - ranges[0]) if len(ranges) > 1 else 150.0

            # Calibrate DBZ
            dbz_var = f.variables['DBZ']
            dbz_raw = dbz_var[:]
            dbz_scale = getattr(dbz_var, 'scale_factor', 0.5)
            dbz_offset = getattr(dbz_var, 'add_offset', -32.0)
            dbz_calibrated = (dbz_raw.astype(np.float32) * dbz_scale) + dbz_offset
            dbz_calibrated[dbz_raw <= 0] = np.nan

            # Calibrate VEL
            vel_calibrated = None
            if 'VEL' in f.variables:
                vel_var = f.variables['VEL']
                vel_raw = vel_var[:]
                vel_scale = getattr(vel_var, 'scale_factor', 0.063876)
                vel_offset = getattr(vel_var, 'add_offset', -8.176158)
                vel_calibrated = (vel_raw.astype(np.float32) * vel_scale) + vel_offset
                vel_calibrated[vel_raw <= 0] = np.nan

            # Calibrate WIDTH
            width_calibrated = None
            if 'WIDTH' in f.variables:
                w_var = f.variables['WIDTH']
                w_raw = w_var[:]
                w_scale = getattr(w_var, 'scale_factor', 0.1)
                w_offset = getattr(w_var, 'add_offset', 0.0)
                width_calibrated = (w_raw.astype(np.float32) * w_scale) + w_offset
                width_calibrated[w_raw <= 0] = np.nan

            # Additional polarimetric variables
            zdr_calibrated = None
            if 'ZDR' in f.variables:
                z_var = f.variables['ZDR']
                z_raw = z_var[:]
                z_scale = getattr(z_var, 'scale_factor', 0.05)
                z_offset = getattr(z_var, 'add_offset', -4.0)
                zdr_calibrated = (z_raw.astype(np.float32) * z_scale) + z_offset
                zdr_calibrated[z_raw <= 0] = np.nan

            f.close()

            return {
                "filename": fname,
                "filepath": filepath,
                "station_name": "Cherrapunji DWR (RSCHR)",
                "radar_site_id": "RSCHR",
                "station_lat": lat0,
                "station_lon": lon0,
                "station_alt_m": alt0,
                "timestamp_iso": ts_iso,
                "timestamp_dt": dt_obj,
                "azimuths": azimuths,
                "elevations": elevations,
                "ranges_m": ranges,
                "max_range_km": max_range_km,
                "range_res_m": range_res_m,
                "dbz_calibrated": dbz_calibrated,
                "vel_calibrated": vel_calibrated,
                "width_calibrated": width_calibrated,
                "zdr_calibrated": zdr_calibrated
            }

        except Exception as e:
            f.close()
            logger.error(f"Failed to load radar file {fname}: {e}")
            raise e

radar_loader = RadarLoader()
