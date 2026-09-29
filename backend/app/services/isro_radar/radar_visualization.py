"""
Radar Visualization Engine
Renders geographically referenced 2-panel Reflectivity (DBZ) and Radial Velocity (VEL) map artifacts with legends and station footprint overlay.
"""
import os
import logging
import numpy as np

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False

logger = logging.getLogger("VAJRA-AI.RadarVisualization")

class RadarVisualization:
    def __init__(self, output_dir: str = r"c:\Users\nalla\OneDrive\Documents\Thunder\thunderAI\backend\data\radar_plots"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def generate_radar_plot(self, radar_data: Dict[str, Any], grid_data: Dict[str, Any]) -> str:
        """
        Renders side-by-side DBZ Reflectivity and Radial Velocity plots for a radar scan.
        """
        if not MATPLOTLIB_AVAILABLE:
            return ""

        fname = radar_data["filename"]
        out_name = f"plot_{fname}.png"
        out_path = os.path.join(self.output_dir, out_name)

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

        dbz_grid = grid_data["grid_dbz"]
        vel_grid = grid_data["grid_vel"]
        bounds = grid_data["bounds"] # [min_lat, min_lon, max_lat, max_lon]
        extent = [bounds[1], bounds[3], bounds[0], bounds[2]] # [min_lon, max_lon, min_lat, max_lat]

        # 1. DBZ Reflectivity Map
        im1 = ax1.imshow(dbz_grid, cmap='turbo', origin='lower', extent=extent, vmin=0, vmax=65)
        ax1.set_title(f"Cherrapunji DWR (RSCHR) Reflectivity (dBZ)\nScan: {radar_data['timestamp_iso']}", fontsize=10)
        ax1.set_xlabel("Longitude (°E)", fontsize=9)
        ax1.set_ylabel("Latitude (°N)", fontsize=9)
        ax1.plot(radar_data["station_lon"], radar_data["station_lat"], 'r^', markersize=8, label="RSCHR DWR Station")
        ax1.legend(loc='upper right', fontsize=8)
        cbar1 = plt.colorbar(im1, ax=ax1, fraction=0.046, pad=0.04)
        cbar1.set_label("Reflectivity (dBZ)", fontsize=9)

        # 2. Radial Velocity Map
        im2 = ax2.imshow(vel_grid, cmap='coolwarm', origin='lower', extent=extent, vmin=-25, vmax=25)
        ax2.set_title(f"Radial Velocity (m/s) [Inbound / Outbound]\nSite: ({radar_data['station_lat']:.2f}°N, {radar_data['station_lon']:.2f}°E)", fontsize=10)
        ax2.set_xlabel("Longitude (°E)", fontsize=9)
        ax2.set_ylabel("Latitude (°N)", fontsize=9)
        ax2.plot(radar_data["station_lon"], radar_data["station_lat"], 'r^', markersize=8, label="RSCHR DWR Station")
        ax2.legend(loc='upper right', fontsize=8)
        cbar2 = plt.colorbar(im2, ax=ax2, fraction=0.046, pad=0.04)
        cbar2.set_label("Radial Velocity (m/s)", fontsize=9)

        plt.tight_layout()
        plt.savefig(out_path, dpi=120)
        plt.close()

        logger.info(f"Generated radar visualization plot: {out_path}")
        return out_path

radar_visualization = RadarVisualization()
