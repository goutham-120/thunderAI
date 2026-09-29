import urllib.request
import json
import sys

BASE_URL = "http://127.0.0.1:8000/api"

endpoints = [
    "/health",
    "/system/status",
    "/data/radar/status",
    "/data/radar/files",
    "/data/radar/scan?grid_rows=64&grid_cols=64",
    "/data/radar/alignment?roi_name=NATIONAL",
    "/data/radar/alignment?roi_name=NORTHEAST_MEGHALAYA",
    "/data/radar/alignment?roi_name=AP_TELANGANA",
    "/forecast/latest?horizon_min=30&region_name=NATIONAL",
    "/forecast/horizons",
    "/forecast/ml-nowcast?horizon_min=30&roi_name=NATIONAL",
    "/forecast/model-metrics",
    "/weather/current?lat=25.2680&lon=91.7332",
    "/weather/nwp?lat=25.2680&lon=91.7332",
    "/storms/active?event_id=LIVE",
    "/alerts/active?event_id=LIVE",
    "/explainability/drivers",
    "/replay/events",
    "/metrics/benchmark"
]

def test_endpoints():
    print("=" * 80)
    print("VAJRA-AI: LIVE BACKAPI ENDPOINT VERIFICATION")
    print("=" * 80)

    passed = 0
    failed = 0

    for ep in endpoints:
        url = f"{BASE_URL}{ep}"
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=5) as response:
                status_code = response.getcode()
                body = response.read().decode('utf-8')
                data = json.loads(body)
                print(f"[HTTP {status_code}] SUCCESS: {ep}")
                passed += 1
        except Exception as e:
            print(f"[HTTP ERROR] FAILED: {ep} -> {e}")
            failed += 1

    print("\n" + "=" * 80)
    print(f"VERIFICATION SUMMARY: {passed} PASSED, {failed} FAILED (Total: {len(endpoints)})")
    print("=" * 80)

if __name__ == "__main__":
    test_endpoints()
