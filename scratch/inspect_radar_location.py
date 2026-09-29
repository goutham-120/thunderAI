"""
Inspect radar station location, timestamps, and range bin size across all NetCDF files.
"""
import os
import glob
from scipy.io import netcdf_file
import numpy as np

downloads_dir = r"C:\Users\nalla\Downloads"
nc_files = sorted(glob.glob(os.path.join(downloads_dir, "RSCHR_*.nc")))

print(f"Total Radar NetCDF files: {len(nc_files)}")

for idx, filepath in enumerate(nc_files):
    fname = os.path.basename(filepath)
    try:
        f = netcdf_file(filepath, 'r', mmap=False)
        lat = float(f.variables['latitude'].data)
        lon = float(f.variables['longitude'].data)
        alt = float(f.variables['altitude'].data)
        range_bins = f.variables['range'][:]
        dr = float(range_bins[1] - range_bins[0]) if len(range_bins) > 1 else 150.0

        title = getattr(f, 'title', b'').decode('utf-8') if hasattr(f, 'title') else ''
        time_str = getattr(f, 'time_coverage_start', b'').decode('utf-8') if hasattr(f, 'time_coverage_start') else ''

        print(f"[{idx+1:02d}] {fname} | Time: {time_str} | Radar Loc: ({lat:.4f}°N, {lon:.4f}°E, {alt:.1f}m) | Max Range: {range_bins[-1]/1000.0:.1f}km (dr={dr:.1f}m)")
        f.close()
    except Exception as e:
        print(f"[{idx+1:02d}] {fname} Error: {e}")
