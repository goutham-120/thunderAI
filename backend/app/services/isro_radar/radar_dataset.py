"""
Radar Dataset & Sequence Manager
Scans data directory dynamically, orders NetCDF files chronologically, detects gaps, and builds radar sequences.
"""
import os
import logging
from typing import Dict, Any, List
from app.services.isro_radar.radar_loader import radar_loader

logger = logging.getLogger("VAJRA-AI.RadarDataset")

class RadarDataset:
    def get_radar_inventory(self) -> List[Dict[str, Any]]:
        """
        Discovers and chronologically orders all NetCDF radar files.
        Detects time deltas and scan gaps.
        """
        files = radar_loader.find_radar_files()
        inventory = []

        for filepath in files:
            fname = os.path.basename(filepath)
            size_mb = os.path.getsize(filepath) / (1024 * 1024)
            dt_obj, ts_iso = radar_loader.parse_filename_timestamp(filepath)

            inventory.append({
                "filename": fname,
                "filepath": filepath,
                "size_mb": round(size_mb, 2),
                "timestamp_iso": ts_iso,
                "timestamp_dt": dt_obj,
                "station_name": "Cherrapunji DWR (RSCHR)"
            })

        inventory.sort(key=lambda x: x["timestamp_dt"])

        # Detect time gaps
        for i in range(len(inventory)):
            if i > 0:
                dt_prev = inventory[i-1]["timestamp_dt"]
                dt_curr = inventory[i]["timestamp_dt"]
                gap_min = (dt_curr - dt_prev).total_seconds() / 60.0
                inventory[i]["gap_minutes_from_prev"] = round(gap_min, 1)
                inventory[i]["irregular_interval"] = (gap_min > 35.0 or gap_min < 5.0)
            else:
                inventory[i]["gap_minutes_from_prev"] = 0.0
                inventory[i]["irregular_interval"] = False

        return inventory

radar_dataset = RadarDataset()
