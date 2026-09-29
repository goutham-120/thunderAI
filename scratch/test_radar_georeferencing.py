"""
Test Georeferencing of Cherrapunji DWR (RSCHR) Polar NetCDF Data onto Geographic Lat/Lon Grid.
"""
import os
import glob
from scipy.io import netcdf_file
import numpy as np

downloads_dir = r"C:\Users\nalla\Downloads"
filepath = os.path.join(downloads_dir, "RSCHR_28SEP2026_001546_L2B_STD.nc")

f = netcdf_file(filepath, 'r', mmap=False)

lat0 = float(f.variables['latitude'].data)
lon0 = float(f.variables['longitude'].data)
alt0 = float(f.variables['altitude'].data)

azimuths = f.variables['azimuth'][:] # 720 rays
elevations = f.variables['elevation'][:] # 720 rays
ranges = f.variables['range'][:] # 1633 bins (m)

dbz_raw = f.variables['DBZ'][:] # (720, 1633)
vel_raw = f.variables['VEL'][:] # (720, 1633)

# Apply scale and offset
dbz_scaled = (dbz_raw * 0.5) - 32.0
vel_scaled = (vel_raw * 0.063876) - 8.176158

# Mask invalid values (e.g. dBZ < 0 or raw == 0/fill)
dbz_scaled[dbz_raw <= 0] = np.nan
vel_scaled[vel_raw <= 0] = np.nan

print(f"Radar Site: Cherrapunji ({lat0:.4f}°N, {lon0:.4f}°E)")
print(f"Azimuths range: {azimuths.min():.1f}° to {azimuths.max():.1f}° (count={len(azimuths)})")
print(f"Ranges range: {ranges.min()/1000:.1f}km to {ranges.max()/1000:.1f}km (count={len(ranges)})")
print(f"DBZ valid min={np.nanmin(dbz_scaled):.1f} dBZ, max={np.nanmax(dbz_scaled):.1f} dBZ, valid count={np.sum(~np.isnan(dbz_scaled))}")
print(f"VEL valid min={np.nanmin(vel_scaled):.1f} m/s, max={np.nanmax(vel_scaled):.1f} m/s, valid count={np.sum(~np.isnan(vel_scaled))}")

# Convert polar (azimuth, range) to geographic lat/lon grid for a 200km bounding box
R_earth = 6371000.0 # meters
az_rad = np.radians(azimuths)[:, np.newaxis] # (720, 1)
r_m = ranges[np.newaxis, :] # (1, 1633)

# Great circle geographic conversion
lat0_rad = np.radians(lat0)
lon0_rad = np.radians(lon0)
d_R = r_m / R_earth

lats_rad = np.arcsin(np.sin(lat0_rad) * np.cos(d_R) + np.cos(lat0_rad) * np.sin(d_R) * np.cos(az_rad))
lons_rad = lon0_rad + np.arctan2(np.sin(az_rad) * np.sin(d_R) * np.cos(lat0_rad), np.cos(d_R) - np.sin(lat0_rad) * np.sin(lats_rad))

lats_deg = np.degrees(lats_rad)
lons_deg = np.degrees(lons_rad)

print(f"Georeferenced bounding box:")
print(f"  Lat min: {lats_deg.min():.4f}°N, max: {lats_deg.max():.4f}°N")
print(f"  Lon min: {lons_deg.min():.4f}°E, max: {lons_deg.max():.4f}°E")

f.close()
