"""
IMD Source Status Tracker
Maintains real-time status of IMD data sources (AWS, Radar, Lightning).
Ensures truthful status reporting without falsely claiming 'ONLINE (SYNCED)' when unverified or unavailable.
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

logger = logging.getLogger("VAJRA-AI.IMDStatusTracker")

class IMDStatusTracker:
    def __init__(self):
        self.sources: Dict[str, Dict[str, Any]] = {
            "aws": {
                "name": "IMD Automatic Weather Station / ARG Network",
                "status": "UNCONFIGURED", # UNCONFIGURED, CONNECTED, DEGRADED, UNAVAILABLE, AUTH_REQUIRED, ERROR
                "last_successful_fetch": None,
                "latest_observation_timestamp": None,
                "latency_ms": None,
                "records_count": 0,
                "error_message": None
            },
            "radar": {
                "name": "IMD Doppler Weather Radar (DWR) Network",
                "status": "UNCONFIGURED",
                "last_successful_fetch": None,
                "latest_observation_timestamp": None,
                "latency_ms": None,
                "records_count": 0,
                "error_message": None
            },
            "lightning": {
                "name": "IMD Lightning Detection Network (IITM/Damini)",
                "status": "UNCONFIGURED",
                "last_successful_fetch": None,
                "latest_observation_timestamp": None,
                "latency_ms": None,
                "records_count": 0,
                "error_message": None
            },
            "nwp_weather": {
                "name": "Real NWP / Weather Data API Provider",
                "status": "UNCONFIGURED", # UNCONFIGURED, ONLINE, OFFLINE, AUTH_REQUIRED, RATE_LIMITED, ERROR
                "last_successful_fetch": None,
                "latest_observation_timestamp": None,
                "latency_ms": None,
                "records_count": 0,
                "error_message": None
            },
            "open_meteo_ecmwf": {
                "name": "Open-Meteo ECMWF IFS HRES (9 km)",
                "status": "UNCONFIGURED", # UNCONFIGURED, REAL, SYNTHETIC_FALLBACK, OFFLINE, ERROR
                "last_successful_fetch": None,
                "latest_observation_timestamp": None,
                "latency_ms": None,
                "records_count": 0,
                "error_message": None
            },
            "mosdac_gsmap": {
                "name": "MOSDAC GSMaP ISRO Rain (0.1° Satellite Precipitation)",
                "status": "UNCONFIGURED", # UNCONFIGURED, AVAILABLE, UNAVAILABLE, AUTH_REQUIRED, ERROR
                "last_successful_fetch": None,
                "latest_observation_timestamp": None,
                "latency_ms": None,
                "records_count": 0,
                "error_message": None
            }
        }

    def update_source(
        self,
        source_key: str,
        status: str,
        latency_ms: Optional[float] = None,
        records_count: int = 0,
        latest_obs_time: Optional[str] = None,
        error_message: Optional[str] = None
    ):
        """Updates status of a specific IMD data source truthful report."""
        if source_key not in self.sources:
            return

        now_iso = datetime.now(timezone.utc).isoformat()
        src = self.sources[source_key]
        src["status"] = status
        src["latency_ms"] = latency_ms
        src["records_count"] = records_count
        src["error_message"] = error_message

        if status in ("CONNECTED", "ONLINE", "REAL"):
            src["last_successful_fetch"] = now_iso
            if latest_obs_time:
                src["latest_observation_timestamp"] = latest_obs_time

    def get_source_status(self, source_key: str) -> Dict[str, Any]:
        """Returns current status summary for a source."""
        return self.sources.get(source_key, {})

    def get_all_statuses(self, data_mode: str = "synthetic") -> Dict[str, Any]:
        """Returns unified status report across all data sources."""
        return {
            "data_mode": data_mode,
            "system_timestamp": datetime.now(timezone.utc).isoformat(),
            "sources": self.sources
        }

status_tracker = IMDStatusTracker()
