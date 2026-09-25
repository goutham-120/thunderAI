"""
Historical Severe Storm Event Library & Replay Simulator
Provides realistic time-series frames and ground-truth validation for iconic Indian severe convective weather events.
"""
from typing import Dict, Any, List

HISTORICAL_EVENTS = [
    {
        "event_id": "HYD-PREMONSOON-2024",
        "title": "Hyderabad Severe Convective Outbreak",
        "date": "2024-05-08",
        "region": "Telangana (Hyderabad DWR Sector)",
        "center_lat": 17.40,
        "center_lon": 78.48,
        "storm_speed_kmh": 26.0,
        "storm_heading_deg": 135.0, # SE
        "peak_dbz": 58.5,
        "peak_lightning_flashes": 42.0,
        "description": "Pre-monsoon supercellular convective cluster causing localized microbursts and intense cloud-to-ground lightning activity.",
        "timestamps": ["14:00", "14:15", "14:30", "14:45", "15:00", "15:15", "15:30", "15:45", "16:00", "16:30", "17:00"]
    },
    {
        "event_id": "ODISHA-KALBAISAKHI-2024",
        "title": "Odisha Kalbaisakhi (Nor'wester) Squall Line",
        "date": "2024-04-19",
        "region": "East Coast / Coastal Odisha & WB",
        "center_lat": 18.20,
        "center_lon": 80.10,
        "storm_speed_kmh": 34.0,
        "storm_heading_deg": 115.0, # ESE
        "peak_dbz": 62.0,
        "peak_lightning_flashes": 58.0,
        "description": "Fast-moving organized squall line triggered by high CAPE (>3200 J/kg) and dry line convergence.",
        "timestamps": ["16:00", "16:15", "16:30", "16:45", "17:00", "17:15", "17:30", "17:45", "18:00", "18:30", "19:00"]
    },
    {
        "event_id": "BENGALURU-URBAN-2023",
        "title": "Bengaluru Convective Cloudburst & Flash Storm",
        "date": "2023-09-14",
        "region": "South Interior Karnataka",
        "center_lat": 16.80,
        "center_lon": 77.80,
        "storm_speed_kmh": 18.0,
        "storm_heading_deg": 160.0, # SSE
        "peak_dbz": 54.0,
        "peak_lightning_flashes": 35.0,
        "description": "Urban heat island induced stationary convective pulse with extreme localized rain rate (>80 mm/hr).",
        "timestamps": ["17:00", "17:15", "17:30", "17:45", "18:00", "18:15", "18:30", "18:45", "19:00", "19:30", "20:00"]
    }
]

class HistoricalReplayService:
    def get_available_events(self) -> List[Dict[str, Any]]:
        return HISTORICAL_EVENTS

    def get_event_by_id(self, event_id: str) -> Dict[str, Any]:
        for ev in HISTORICAL_EVENTS:
            if ev["event_id"] == event_id:
                return ev
        return HISTORICAL_EVENTS[0]

historical_service = HistoricalReplayService()
