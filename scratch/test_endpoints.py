import urllib.request
import json

base_url = "http://127.0.0.1:8000"

endpoints = [
    "/api/data/mosdac/status",
    "/api/data/mosdac/insat",
    "/api/data/mosdac/insat3ds/sequence",
    "/api/forecast/latest?horizon_min=30&event_id=LIVE"
]

for ep in endpoints:
    url = base_url + ep
    print(f"\n--- Testing {ep} ---")
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print("Status:", resp.status)
            print("Keys:", list(data.keys()))
            if "status" in data:
                print("Data status:", data["status"])
            if "source" in data:
                print("Source:", data["source"])
            if "convective_features" in data:
                print("Features:", data["convective_features"])
            if "spatiotemporal_tendencies" in data:
                print("Tendencies:", data["spatiotemporal_tendencies"])
    except Exception as e:
        print("ERROR:", e)
