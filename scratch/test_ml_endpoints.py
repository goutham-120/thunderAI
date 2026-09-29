import urllib.request
import json

base_url = "http://127.0.0.1:8000"

endpoints = [
    "/api/system/status",
    "/api/forecast/model-metrics",
    "/api/forecast/ml-nowcast?horizon_min=30&roi_name=AP_TELANGANA",
    "/api/forecast/latest?horizon_min=30&event_id=LIVE"
]

for ep in endpoints:
    url = base_url + ep
    print(f"\n=== Testing {ep} ===")
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print("Status Code:", resp.status)
            print("Response:", json.dumps(data, indent=2)[:400] + "...\n")
    except Exception as e:
        print("ERROR:", e)
