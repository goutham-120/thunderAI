"""
INSAT-3DS Satellite Data Processing & Feature Extraction Pipeline (Phase 1 & 2)
Handles HDF5 ingestion, LUT calibration, ROI cropping, spatiotemporal convective feature extraction, caching, and baseline nowcast projection.
"""
import os
import glob
import logging
import json
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

try:
    import h5py
    H5PY_AVAILABLE = True
except ImportError:
    H5PY_AVAILABLE = False

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False

logger = logging.getLogger("VAJRA-AI.INSAT3DSProcessor")

# Mercator projection bounds of INSAT-3DS L1C SGP Imager
SECTOR_UPPER_LEFT_LAT = 50.0
SECTOR_LOWER_LAT = -50.0
SECTOR_LEFT_LON = 20.0
SECTOR_RIGHT_LON = 130.0
SECTOR_ROWS = 3207
SECTOR_COLS = 3062

# Preset Regions of Interest (ROI)
ROI_BOUNDS = {
    'AP_TELANGANA': {'min_lat': 14.0, 'max_lat': 20.0, 'min_lon': 76.0, 'max_lon': 84.0},
    'EAST_COAST': {'min_lat': 18.0, 'max_lat': 24.0, 'min_lon': 83.0, 'max_lon': 90.0},
    'KARNATAKA': {'min_lat': 11.0, 'max_lat': 16.0, 'min_lon': 74.0, 'max_lon': 79.0},
    'NATIONAL': {'min_lat': 8.0, 'max_lat': 36.0, 'min_lon': 68.0, 'max_lon': 96.0},
    'NORTHEAST_MEGHALAYA': {'min_lat': 24.0, 'max_lat': 27.0, 'min_lon': 90.0, 'max_lon': 94.0}
}

def lat_to_y(lat_deg: float, R: float = 6378137.0) -> float:
    """Convert latitude in degrees to Mercator Y coordinate in meters."""
    lat_rad = np.radians(np.clip(lat_deg, -85.0, 85.0))
    return R * np.log(np.tan(np.pi / 4.0 + lat_rad / 2.0))

Y_MAX = lat_to_y(SECTOR_UPPER_LEFT_LAT)
Y_MIN = lat_to_y(SECTOR_LOWER_LAT)

def lat_to_row(lat_deg: float, rows: int = SECTOR_ROWS) -> int:
    """Map latitude degree to array row index (row 0 is North/top)."""
    y_val = lat_to_y(lat_deg)
    frac = (Y_MAX - y_val) / (Y_MAX - Y_MIN)
    return int(np.clip(round(frac * (rows - 1)), 0, rows - 1))

def lon_to_col(lon_deg: float, min_lon: float = SECTOR_LEFT_LON, max_lon: float = SECTOR_RIGHT_LON, cols: int = SECTOR_COLS) -> int:
    """Map longitude degree to array column index (col 0 is West/left)."""
    frac = (lon_deg - min_lon) / (max_lon - min_lon)
    return int(np.clip(round(frac * (cols - 1)), 0, cols - 1))

class INSAT3DSProcessor:
    def __init__(
        self,
        data_dir: str = r"C:\Users\nalla\Downloads",
        cache_dir: str = r"C:\Users\nalla\OneDrive\Documents\Thunder\thunderAI\backend\data\insat_cache"
    ):
        self.data_dir = data_dir
        self.cache_dir = cache_dir
        self.plots_dir = os.path.join(cache_dir, "plots")
        os.makedirs(self.cache_dir, exist_ok=True)
        os.makedirs(self.plots_dir, exist_ok=True)

    def scan_inventory(self) -> List[Dict[str, Any]]:
        """
        Scans data directory for INSAT-3DS L1C SGP files, parses timestamps, and orders them chronologically.
        Explicitly identifies missing intermediate scan slots.
        """
        if not os.path.exists(self.data_dir):
            return []

        pattern = os.path.join(self.data_dir, "3SIMG_*_L1C_SGP_*.h5")
        files = glob.glob(pattern)

        inventory = []
        for filepath in files:
            fname = os.path.basename(filepath)
            size_mb = os.path.getsize(filepath) / (1024 * 1024)

            parsed_dt = None
            acq_time_gmt = ""
            if H5PY_AVAILABLE:
                try:
                    with h5py.File(filepath, 'r') as hf:
                        acq_date = hf.attrs.get('Acquisition_Date', '')
                        if isinstance(acq_date, bytes):
                            acq_date = acq_date.decode('utf-8', errors='ignore')

                        acq_gmt = hf.attrs.get('Acquisition_Time_in_GMT', '')
                        if isinstance(acq_gmt, bytes):
                            acq_gmt = acq_gmt.decode('utf-8', errors='ignore')
                        acq_time_gmt = str(acq_gmt)

                        start_str = hf.attrs.get('Acquisition_Start_Time', '')
                        if isinstance(start_str, bytes):
                            start_str = start_str.decode('utf-8', errors='ignore')

                        if start_str:
                            try:
                                parsed_dt = datetime.strptime(start_str.split('.')[0], "%d-%b-%Y%H:%M:%S")
                                parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)
                            except Exception:
                                pass
                except Exception as e:
                    logger.warning(f"Failed to read metadata from {fname}: {e}")

            if parsed_dt is None:
                parts = fname.split('_')
                if len(parts) >= 3:
                    try:
                        date_str = parts[1] # e.g. 28SEP2026
                        time_str = parts[2] # e.g. 2330
                        parsed_dt = datetime.strptime(f"{date_str}{time_str}", "%d%b%Y%H%M")
                        parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)
                    except Exception:
                        parsed_dt = datetime.now(timezone.utc)

            inventory.append({
                "filename": fname,
                "filepath": filepath,
                "size_mb": round(size_mb, 2),
                "timestamp_iso": parsed_dt.isoformat(),
                "timestamp_dt": parsed_dt,
                "acq_time_gmt": acq_time_gmt
            })

        # Sort chronologically
        inventory.sort(key=lambda x: x["timestamp_dt"])

        # Detect gaps in 30-min sequence
        for i in range(len(inventory)):
            if i > 0:
                dt_prev = inventory[i-1]["timestamp_dt"]
                dt_curr = inventory[i]["timestamp_dt"]
                diff_min = (dt_curr - dt_prev).total_seconds() / 60.0
                inventory[i]["gap_minutes_from_prev"] = diff_min
                inventory[i]["missing_intermediate_scan"] = diff_min > 35.0
            else:
                inventory[i]["gap_minutes_from_prev"] = 0.0
                inventory[i]["missing_intermediate_scan"] = False

        return inventory

    def read_and_calibrate_scan(
        self,
        filepath: str,
        roi_name: str = 'AP_TELANGANA',
        target_grid_size: Tuple[int, int] = (64, 64)
    ) -> Dict[str, Any]:
        """
        Reads HDF5 file, applies LUT calibration, crops to geographic ROI, and resamples to target grid size.
        Uses cached result if available.
        """
        fname = os.path.basename(filepath)
        cache_key = f"{fname}_{roi_name}_{target_grid_size[0]}x{target_grid_size[1]}.npz"
        cache_path = os.path.join(self.cache_dir, cache_key)

        if os.path.exists(cache_path):
            try:
                cached = np.load(cache_path, allow_pickle=True)
                return {
                    "filename": fname,
                    "roi_name": roi_name,
                    "timestamp_iso": str(cached["timestamp_iso"]),
                    "tir1_celsius": cached["tir1_celsius"],
                    "tir2_celsius": cached["tir2_celsius"],
                    "wv_celsius": cached["wv_celsius"],
                    "mir_celsius": cached["mir_celsius"],
                    "split_window_diff": cached["split_window_diff"],
                    "cached": True
                }
            except Exception as e:
                logger.warning(f"Cache load failed for {cache_key}, re-processing: {e}")

        if not H5PY_AVAILABLE:
            raise RuntimeError("h5py module is required to read INSAT-3DS HDF5 files.")

        bounds = ROI_BOUNDS.get(roi_name, ROI_BOUNDS['AP_TELANGANA'])
        r_top = lat_to_row(bounds['max_lat'])
        r_bot = lat_to_row(bounds['min_lat'])
        c_left = lon_to_col(bounds['min_lon'])
        c_right = lon_to_col(bounds['max_lon'])

        with h5py.File(filepath, 'r') as hf:
            start_str = hf.attrs.get('Acquisition_Start_Time', '')
            if isinstance(start_str, bytes): start_str = start_str.decode('utf-8', errors='ignore')
            try:
                dt = datetime.strptime(start_str.split('.')[0], "%d-%b-%Y%H:%M:%S").replace(tzinfo=timezone.utc)
                ts_iso = dt.isoformat()
            except Exception:
                parts = fname.split('_')
                if len(parts) >= 3:
                    try:
                        date_str, time_str = parts[1], parts[2]
                        dt = datetime.strptime(f"{date_str}{time_str}", "%d%b%Y%H%M").replace(tzinfo=timezone.utc)
                        ts_iso = dt.isoformat()
                    except Exception:
                        ts_iso = datetime.now(timezone.utc).isoformat()
                else:
                    ts_iso = datetime.now(timezone.utc).isoformat()

            # Helper for reading & calibrating a channel
            def get_calibrated_channel(channel_name: str, lut_name: str) -> np.ndarray:
                if channel_name not in hf or lut_name not in hf:
                    return np.full((target_grid_size[0], target_grid_size[1]), np.nan, dtype=np.float32)

                raw_crop = hf[channel_name][0, r_top:r_bot, c_left:c_right]
                fill_val = hf[channel_name].attrs.get('_FillValue', [1023])[0]
                lut = hf[lut_name][:]

                valid_mask = (raw_crop > 0) & (raw_crop < fill_val) & (raw_crop < len(lut))
                calibrated_k = np.full(raw_crop.shape, np.nan, dtype=np.float32)
                calibrated_k[valid_mask] = lut[raw_crop[valid_mask]]

                calibrated_c = calibrated_k - 273.15
                # Downsample/resample to target grid size using bilinear interpolation
                from scipy.ndimage import zoom
                zoom_factors = (target_grid_size[0] / calibrated_c.shape[0], target_grid_size[1] / calibrated_c.shape[1])
                resampled = zoom(calibrated_c, zoom_factors, order=1, mode='nearest')
                return resampled.astype(np.float32)

            tir1_celsius = get_calibrated_channel('IMG_TIR1', 'IMG_TIR1_TEMP')
            tir2_celsius = get_calibrated_channel('IMG_TIR2', 'IMG_TIR2_TEMP')
            wv_celsius = get_calibrated_channel('IMG_WV', 'IMG_WV_TEMP')
            mir_celsius = get_calibrated_channel('IMG_MIR', 'IMG_MIR_TEMP')
            split_window_diff = tir1_celsius - tir2_celsius

        # Save to cache
        np.savez_compressed(
            cache_path,
            timestamp_iso=ts_iso,
            tir1_celsius=tir1_celsius,
            tir2_celsius=tir2_celsius,
            wv_celsius=wv_celsius,
            mir_celsius=mir_celsius,
            split_window_diff=split_window_diff
        )

        return {
            "filename": fname,
            "roi_name": roi_name,
            "timestamp_iso": ts_iso,
            "tir1_celsius": tir1_celsius,
            "tir2_celsius": tir2_celsius,
            "wv_celsius": wv_celsius,
            "mir_celsius": mir_celsius,
            "split_window_diff": split_window_diff,
            "cached": False
        }

    def extract_convective_features(self, scan_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Phase 2: Extracts cloud-top statistics, cold-cloud area coverage, and multichannel split-window metrics.
        """
        tir1 = scan_data["tir1_celsius"]
        wv = scan_data["wv_celsius"]
        split = scan_data["split_window_diff"]

        valid_tir1 = tir1[~np.isnan(tir1)]

        min_temp_c = float(np.min(valid_tir1)) if len(valid_tir1) > 0 else 25.0
        mean_temp_c = float(np.mean(valid_tir1)) if len(valid_tir1) > 0 else 20.0

        # Pixel size for 4km INSAT resolution: ~16 km² per pixel
        pixel_area_km2 = 16.0

        cold_cloud_pixels = np.sum(valid_tir1 < -33.0) # T < -33°C (240 K)
        deep_convective_pixels = np.sum(valid_tir1 < -50.0) # T < -50°C (223 K)
        overshooting_pixels = np.sum(valid_tir1 < -63.0) # T < -63°C (210 K)

        cold_cloud_area_km2 = float(cold_cloud_pixels * pixel_area_km2)
        deep_convective_area_km2 = float(deep_convective_pixels * pixel_area_km2)
        overshooting_area_km2 = float(overshooting_pixels * pixel_area_km2)

        valid_wv = wv[~np.isnan(wv)]
        valid_split = split[~np.isnan(split)]

        return {
            "timestamp_iso": scan_data["timestamp_iso"],
            "min_cloud_top_temp_c": round(min_temp_c, 2),
            "mean_cloud_top_temp_c": round(mean_temp_c, 2),
            "cold_cloud_area_km2": round(cold_cloud_area_km2, 1),
            "deep_convective_area_km2": round(deep_convective_area_km2, 1),
            "overshooting_top_area_km2": round(overshooting_area_km2, 1),
            "mean_water_vapor_temp_c": round(float(np.mean(valid_wv)), 2) if len(valid_wv) > 0 else -30.0,
            "mean_split_window_diff_c": round(float(np.mean(valid_split)), 2) if len(valid_split) > 0 else 0.5,
            "convective_intensity_score": round(max(0.0, min(100.0, (-min_temp_c - 20.0) * 1.5)), 1)
        }

    def compute_spatiotemporal_tendencies(
        self,
        prev_scan: Dict[str, Any],
        curr_scan: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Phase 2: Computes cloud-top cooling rate, cold-core expansion rate, and cloud motion vectors across consecutive scans.
        """
        f_prev = self.extract_convective_features(prev_scan)
        f_curr = self.extract_convective_features(curr_scan)

        t_prev = datetime.fromisoformat(f_prev["timestamp_iso"].replace("Z", "+00:00"))
        t_curr = datetime.fromisoformat(f_curr["timestamp_iso"].replace("Z", "+00:00"))
        dt_hours = (t_curr - t_prev).total_seconds() / 3600.0

        if dt_hours <= 0:
            dt_hours = 0.5 # Default 30 min

        cooling_rate_c_per_hr = (f_prev["min_cloud_top_temp_c"] - f_curr["min_cloud_top_temp_c"]) / dt_hours
        area_expansion_rate_km2_per_hr = (f_curr["deep_convective_area_km2"] - f_prev["deep_convective_area_km2"]) / dt_hours

        # Phase correlation cloud motion estimation on TIR1 grid
        grid_prev = np.nan_to_num(prev_scan["tir1_celsius"], nan=20.0)
        grid_curr = np.nan_to_num(curr_scan["tir1_celsius"], nan=20.0)

        from scipy.signal import fftconvolve
        # Normalized cross correlation shift estimation
        g1 = grid_prev - np.mean(grid_prev)
        g2 = grid_curr - np.mean(grid_curr)
        corr = fftconvolve(g1, g2[::-1, ::-1], mode='same')
        mid_y, mid_x = corr.shape[0] // 2, corr.shape[1] // 2
        max_y, max_x = np.unravel_index(np.argmax(corr), corr.shape)

        shift_y = max_y - mid_y
        shift_x = max_x - mid_x
        # 4km per pixel
        dist_km = float(np.sqrt((shift_x * 4.0)**2 + (shift_y * 4.0)**2))
        speed_kmh = float(dist_km / dt_hours)
        heading_deg = float((np.degrees(np.arctan2(shift_x, -shift_y)) + 360) % 360)

        return {
            "time_delta_hours": round(dt_hours, 2),
            "cooling_rate_c_per_hr": round(cooling_rate_c_per_hr, 2),
            "cold_core_expansion_rate_km2_per_hr": round(area_expansion_rate_km2_per_hr, 1),
            "cloud_motion_speed_kmh": round(speed_kmh, 1),
            "cloud_motion_heading_deg": round(heading_deg, 1),
            "features_curr": f_curr
        }

    def generate_diagnostic_plots(self, scan_data: Dict[str, Any]) -> str:
        """
        Generates diagnostic visualization plots for a satellite scan and saves PNG artifact.
        """
        if not MATPLOTLIB_AVAILABLE:
            return ""

        fname = scan_data["filename"]
        out_name = f"plot_{fname}.png"
        out_path = os.path.join(self.plots_dir, out_name)

        fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(12, 10))

        # 1. TIR1 Temperature
        im1 = ax1.imshow(scan_data["tir1_celsius"], cmap='jet_r', vmin=-70, vmax=35)
        ax1.set_title(f"INSAT-3DS TIR1 Cloud Top Temp (°C)\n{scan_data['timestamp_iso']}", fontsize=10)
        plt.colorbar(im1, ax=ax1, fraction=0.046, pad=0.04)

        # 2. Water Vapor
        im2 = ax2.imshow(scan_data["wv_celsius"], cmap='viridis', vmin=-65, vmax=-15)
        ax2.set_title("Water Vapor Temp (°C)", fontsize=10)
        plt.colorbar(im2, ax=ax2, fraction=0.046, pad=0.04)

        # 3. Split Window Difference
        im3 = ax3.imshow(scan_data["split_window_diff"], cmap='coolwarm', vmin=-3, vmax=5)
        ax3.set_title("TIR1 - TIR2 Split Window Difference (°C)", fontsize=10)
        plt.colorbar(im3, ax=ax3, fraction=0.046, pad=0.04)

        # 4. Deep Convective Cores (< -50°C) Mask
        convective_mask = scan_data["tir1_celsius"] < -50.0
        im4 = ax4.imshow(convective_mask, cmap='Reds')
        ax4.set_title("Deep Convective Cores (BT < -50°C)", fontsize=10)
        plt.colorbar(im4, ax=ax4, fraction=0.046, pad=0.04)

        plt.tight_layout()
        plt.savefig(out_path, dpi=120)
        plt.close()
        return out_path

insat_processor = INSAT3DSProcessor()
