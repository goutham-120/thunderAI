"""
Common Alerting Protocol (CAP - ITU-T X.1303) Emergency Warning Engine
Generates standardized multi-sector emergency warnings for National Disaster Management Authority (NDMA), State Disaster Management Authorities (SDMA), Aviation (DGCA/AAI), and Power Infrastructure.
"""
from typing import List, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid

class CAPAlertEngine:
    def generate_cap_alerts(self, active_cells: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Transforms high-risk convective cells into ITU-T X.1303 compliant alerts.
        """
        alerts = []
        now_dt = datetime.now(timezone.utc)

        for cell in active_cells:
            severity = cell.get("severity", "MODERATE")
            if severity not in ["EXTREME", "SEVERE", "MODERATE"]:
                continue

            alert_id = f"IN-IMD-CAP-{now_dt.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
            urgency = "Immediate" if severity == "EXTREME" else "Expected"
            certainty = "Observed" if cell.get("max_dbz", 0) > 50 else "Likely"
            expires_dt = now_dt + timedelta(minutes=120)

            lat = cell["center"]["lat"]
            lon = cell["center"]["lon"]
            speed = cell["movement"]["speed_kmh"]
            direction = cell["movement"]["direction_compass"]
            max_dbz = cell["max_dbz"]
            lightning = cell["lightning_flash_rate_min"]

            headline = f"RED ALERT: Severe Thunderstorm & Lightning Hazard - Cell {cell['cell_id']}" if severity == "EXTREME" else f"ORANGE WARNING: Convective Storm Activity - Cell {cell['cell_id']}"
            description = (
                f"Multi-sensor Doppler Radar and Satellite fusion detected an intense convective system near "
                f"Lat: {lat}°N, Lon: {lon}°E. Radar reflectivity: {max_dbz} dBZ. "
                f"Lightning strike rate: {lightning} flashes/min. Moving {direction} at {speed} km/h. "
                f"Anticipated high-intensity rainfall (>50 mm/hr), damaging wind gusts (>60 km/h), and frequent cloud-to-ground lightning."
            )

            instruction = (
                "1. Seek immediate shelter in substantial enclosed buildings.\n"
                "2. Avoid open fields, elevated areas, and isolated trees.\n"
                "3. Aviation: Expect severe low-level wind shear and microburst turbulence.\n"
                "4. Power Grid: Pre-emptively isolate sensitive transmission sub-stations in track cone."
            )

            cap_payload = {
                "identifier": alert_id,
                "sender": "imd.nowcast.vajra@moes.gov.in",
                "sent": now_dt.isoformat(),
                "status": "Actual",
                "msgType": "Alert",
                "scope": "Public",
                "info": {
                    "category": "Met",
                    "event": "Severe Thunderstorm & Lightning Outbreak",
                    "urgency": urgency,
                    "severity": severity,
                    "certainty": certainty,
                    "eventCode": "THU-LGT-NOWCAST",
                    "effective": now_dt.isoformat(),
                    "expires": expires_dt.isoformat(),
                    "headline": headline,
                    "description": description,
                    "instruction": instruction,
                    "area": {
                        "areaDesc": f"Downstream Corridor ({direction} of {lat:.2f}N, {lon:.2f}E)",
                        "circle": f"{lat},{lon},35.0", # 35km impact radius
                        "affected_sectors": ["Civil Aviation", "Power Transmission", "Agriculture & Rural", "Urban Road Transport"]
                    }
                },
                "cell_id": cell["cell_id"],
                "color_code": "#EF4444" if severity == "EXTREME" else "#F97316"
            }
            alerts.append(cap_payload)

        return alerts

cap_engine = CAPAlertEngine()
