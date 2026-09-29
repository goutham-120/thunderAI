"""
Satellite and Radar Multimodal Data Alignment Engine
Evaluates spatial footprint overlap between Cherrapunji DWR radar station (25.268°N, 91.733°E)
and requested satellite ROI bounds (AP_TELANGANA, EAST_COAST, KARNATAKA, NATIONAL, NORTHEAST_MEGHALAYA).
Matches radar scans with INSAT-3DS satellite frames using strict time tolerance policy (<= 15 min).
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from app.services.isro_radar.radar_dataset import radar_dataset
from app.services.insat_3ds_processor import insat_processor, ROI_BOUNDS

logger = logging.getLogger("VAJRA-AI.DataAlignment")

# Cherrapunji DWR footprint: [23.11°N, 89.35°E, 27.43°N, 94.12°E]
RADAR_FOOTPRINT = {
    "min_lat": 23.11,
    "min_lon": 89.35,
    "max_lat": 27.43,
    "max_lon": 94.12
}

class DataAlignment:
    def evaluate_spatial_overlap(self, roi_name: str = "AP_TELANGANA") -> Dict[str, Any]:
        """
        Evaluates geographic bounding box intersection between Cherrapunji DWR footprint and selected ROI.
        """
        roi_b = ROI_BOUNDS.get(roi_name, ROI_BOUNDS["AP_TELANGANA"])
        r_b = RADAR_FOOTPRINT

        # Calculate intersection rectangle
        inter_min_lat = max(roi_b["min_lat"], r_b["min_lat"])
        inter_max_lat = min(roi_b["max_lat"], r_b["max_lat"])
        inter_min_lon = max(roi_b["min_lon"], r_b["min_lon"])
        inter_max_lon = min(roi_b["max_lon"], r_b["max_lon"])

        has_overlap = (inter_min_lat < inter_max_lat) and (inter_min_lon < inter_max_lon)

        if has_overlap:
            inter_area = (inter_max_lat - inter_min_lat) * (inter_max_lon - inter_min_lon)
            radar_area = (r_b["max_lat"] - r_b["min_lat"]) * (r_b["max_lon"] - r_b["min_lon"])
            overlap_pct = min(100.0, round((inter_area / radar_area) * 100.0, 1))
            status = "SPATIALLY_ALIGNED"
            desc = f"Cherrapunji DWR footprint intersects {roi_name} ({overlap_pct}% area overlap)."
        else:
            overlap_pct = 0.0
            status = "NO_SPATIAL_OVERLAP"
            desc = (
                f"No spatial overlap between {roi_name} ({roi_b['min_lat']}°N-{roi_b['max_lat']}°N) "
                f"and Cherrapunji DWR ({r_b['min_lat']}°N-{r_b['max_lat']}°N in Northeast India)."
            )

        return {
            "roi_name": roi_name,
            "has_spatial_overlap": has_overlap,
            "overlap_status": status,
            "overlap_percentage": overlap_pct,
            "description": desc,
            "radar_footprint": r_b,
            "roi_bounds": roi_b
        }

    def match_satellite_and_radar_sequences(self, roi_name: str = "NATIONAL", time_tolerance_min: float = 15.0) -> Dict[str, Any]:
        """
        Pairs chronological INSAT-3DS satellite scans with Cherrapunji DWR radar scans within time_tolerance_min.
        """
        sat_inventory = insat_processor.scan_inventory()
        radar_inventory = radar_dataset.get_radar_inventory()

        spatial_eval = self.evaluate_spatial_overlap(roi_name)

        matched_pairs = []
        unmatched_sat = []

        for sat_item in sat_inventory:
            sat_dt = sat_item["timestamp_dt"]
            best_match = None
            min_delta_min = 9999.0

            for rad_item in radar_inventory:
                rad_dt = rad_item["timestamp_dt"]
                delta_min = abs((sat_dt - rad_dt).total_seconds()) / 60.0

                if delta_min <= time_tolerance_min and delta_min < min_delta_min:
                    min_delta_min = delta_min
                    best_match = rad_item

            if best_match is not None:
                matched_pairs.append({
                    "satellite_filename": sat_item["filename"],
                    "satellite_time_iso": sat_item["timestamp_iso"],
                    "radar_filename": best_match["filename"],
                    "radar_time_iso": best_match["timestamp_iso"],
                    "time_delta_minutes": round(min_delta_min, 1)
                })
            else:
                unmatched_sat.append(sat_item["filename"])

        return {
            "roi_name": roi_name,
            "spatial_alignment": spatial_eval,
            "total_satellite_scans": len(sat_inventory),
            "total_radar_scans": len(radar_inventory),
            "matched_pairs_count": len(matched_pairs),
            "matched_pairs": matched_pairs,
            "unmatched_satellite_scans_count": len(unmatched_sat),
            "time_tolerance_minutes": time_tolerance_min
        }

data_alignment = DataAlignment()
