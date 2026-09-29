"""
Radar NetCDF Inspection Script using scipy.io.netcdf_file
Inspects metadata, variables, station lat/lon, dimensions, scan timestamps, and polar coordinate parameters.
"""
import os
import glob
from scipy.io import netcdf_file
import numpy as np

downloads_dir = r"C:\Users\nalla\Downloads"
nc_files = sorted(glob.glob(os.path.join(downloads_dir, "RSCHR_*.nc")))

print(f"Found {len(nc_files)} radar NetCDF files in {downloads_dir}:")

for idx, filepath in enumerate(nc_files[:3]):
    fname = os.path.basename(filepath)
    print(f"\n==========================================")
    print(f"File [{idx+1}/{len(nc_files)}]: {fname}")
    print(f"==========================================")
    try:
        f = netcdf_file(filepath, 'r', mmap=False)
        print("Global Attributes:")
        for k in dir(f):
            if not k.startswith('_') and k not in ['variables', 'dimensions', 'filename', 'fp', 'mode', 'mmap', 'version_byte', 'close', 'flush', 'sync']:
                try:
                    val = getattr(f, k)
                    if isinstance(val, bytes): val = val.decode('utf-8', errors='ignore')
                    print(f"  {k}: {val}")
                except Exception:
                    pass

        print("\nDimensions:")
        for dim, length in f.dimensions.items():
            print(f"  {dim}: {length}")

        print("\nVariables:")
        for varname, var in f.variables.items():
            print(f"  {varname}: shape={var.shape}, type={var.typecode()}")
            for attr_name in dir(var):
                if not attr_name.startswith('_') and attr_name not in ['shape', 'typecode', 'data', 'dimensions', 'getValue', 'assign_value']:
                    try:
                        val = getattr(var, attr_name)
                        if isinstance(val, bytes): val = val.decode('utf-8', errors='ignore')
                        print(f"      attr -> {attr_name}: {val}")
                    except Exception:
                        pass

        f.close()
    except Exception as e:
        print(f"Error inspecting {fname}: {e}")
