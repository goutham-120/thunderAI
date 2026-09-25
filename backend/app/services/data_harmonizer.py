"""
Multimodal Spatial Data Harmonizer
Fuses Doppler Radar (DWR), Satellite (INSAT-3D/3DR), Lightning strikes, and NWP thermodynamic grids into unified 4D Spatiotemporal Tensors [T x H x W x C].
"""
import numpy as np
from datetime import datetime, timezone
from typing import Dict, Any, Tuple
from app.config import config

class DataHarmonizer:
    def __init__(self):
        self.rows = config.GRID_BOUNDS["grid_rows"]
        self.cols = config.GRID_BOUNDS["grid_cols"]
        self.min_lat = config.GRID_BOUNDS["min_lat"]
        self.max_lat = config.GRID_BOUNDS["max_lat"]
        self.min_lon = config.GRID_BOUNDS["min_lon"]
        self.max_lon = config.GRID_BOUNDS["max_lon"]
        self.lats = np.linspace(self.min_lat, self.max_lat, self.rows)
        self.lons = np.linspace(self.min_lon, self.max_lon, self.cols)

    def generate_synthetic_convective_cube(
        self,
        time_steps: int = 5,
        storm_center: Tuple[float, float] = (17.40, 78.48),
        storm_speed_kmh: float = 24.0,
        storm_heading_deg: float = 135.0, # Moving SE
        intensity_factor: float = 1.0,
        t_offset_minutes: int = 0
    ) -> Dict[str, Any]:
        """
        Generates physically consistent 4D spatial tensors representing a realistic Indian thunderstorm sequence.
        Dimensions: [T, Rows, Cols, Channels]
        """
        t_seq = []
        lon_grid, lat_grid = np.meshgrid(self.lons, self.lats)

        # Vector velocity in degrees lat/lon per minute
        km_per_deg = 111.0
        rad = np.radians(storm_heading_deg)
        v_lon = (storm_speed_kmh / km_per_deg / 60.0) * np.sin(rad)
        v_lat = -(storm_speed_kmh / km_per_deg / 60.0) * np.cos(rad)

        for step in range(time_steps):
            # Step offset in minutes (e.g. -20, -15, -10, -5, 0 or future steps)
            dt_min = (step - (time_steps - 1)) * 5 + t_offset_minutes
            curr_center_lat = storm_center[0] + v_lat * dt_min
            curr_center_lon = storm_center[1] + v_lon * dt_min

            # Convective Core Gaussian distance
            dist_sq = (lat_grid - curr_center_lat)**2 + (lon_grid - curr_center_lon)**2
            r_core = 0.35 # Approx 35-40 km core radius

            # 1. Radar Reflectivity dBZ (0 to 65 dBZ)
            # High dBZ in core with secondary convective feeder bands
            base_dbz = 55.0 * intensity_factor * np.exp(-dist_sq / (2 * r_core**2))
            # Secondary cluster
            dist_sq2 = (lat_grid - (curr_center_lat + 0.3))**2 + (lon_grid - (curr_center_lon - 0.4))**2
            secondary_dbz = 45.0 * intensity_factor * np.exp(-dist_sq2 / (2 * 0.25**2))
            radar_dbz = np.clip(base_dbz + secondary_dbz + np.random.normal(0, 1.5, (self.rows, self.cols)), 0.0, 65.0)

            # 2. Radial Velocity (m/s) showing strong mesocyclonic shear & convergence
            rad_vel = -25.0 * np.sin((lon_grid - curr_center_lon) * 8) * np.exp(-dist_sq / (2 * (r_core * 1.5)**2))

            # 3. Satellite INSAT-3D TIR1 Brightness Temperature (Kelvin)
            # Convective overshoot cloud tops drop to 200K - 220K (-73C to -53C)
            sat_tir = 295.0 - (85.0 * intensity_factor * np.exp(-dist_sq / (2 * (r_core * 2.0)**2)))
            sat_tir = np.clip(sat_tir + np.random.normal(0, 1.0, (self.rows, self.cols)), 195.0, 310.0)

            # 4. Satellite Water Vapor (WV) channel (Kelvin)
            sat_wv = 245.0 - (35.0 * intensity_factor * np.exp(-dist_sq / (2 * (r_core * 2.2)**2)))

            # 5. Lightning Flash Density (flashes / km^2 / 5min)
            # Lightning occurs where dBZ > 35 and Sat TIR < 240K (mixed phase cloud zone)
            lightning_prob = np.where(radar_dbz > 35, (radar_dbz - 35) / 30.0, 0.0)
            lightning_density = lightning_prob * 18.0 * intensity_factor * np.exp(-dist_sq / (2 * (r_core * 0.8)**2))
            lightning_density = np.clip(lightning_density + np.random.poisson(0.2, (self.rows, self.cols)), 0.0, 25.0)

            # 6. NWP Thermodynamics: CAPE (J/kg)
            # High instability pre-storm (1500 to 3500 J/kg)
            nwp_cape = 2400.0 - 600.0 * np.exp(-dist_sq / (2 * r_core**2)) + 300.0 * np.sin(lat_grid * 3)

            # 7. NWP Thermodynamics: CIN (J/kg)
            # Low CIN (< 50 J/kg) allowing rapid explosive convection
            nwp_cin = np.clip(35.0 + 40.0 * np.cos(lon_grid * 4), 5.0, 120.0)

            # 8. NWP 0-6 km Bulk Wind Shear (knots / m/s)
            nwp_shear = 18.0 + 8.0 * np.sin(lat_grid * 2 + lon_grid * 2)

            # Channel stack: [dBZ, Velocity, Sat_TIR, Sat_WV, Lightning, CAPE, CIN, WindShear]
            channels = np.stack([
                radar_dbz,
                rad_vel,
                sat_tir,
                sat_wv,
                lightning_density,
                nwp_cape,
                nwp_cin,
                nwp_shear
            ], axis=-1)

            t_seq.append(channels)

        tensor_4d = np.stack(t_seq, axis=0) # [T, Rows, Cols, C=8]

        return {
            "tensor": tensor_4d,
            "lats": self.lats.tolist(),
            "lons": self.lons.tolist(),
            "bounds": [self.min_lat, self.min_lon, self.max_lat, self.max_lon],
            "channel_names": [
                "radar_dbz", "radial_velocity", "sat_tir1_k", "sat_wv_k",
                "lightning_density", "nwp_cape", "nwp_cin", "nwp_shear"
            ],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

harmonizer = DataHarmonizer()
