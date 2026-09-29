"""
Test Doppler Weather Radar API endpoints
"""
import urllib.request
import json

base_url = "http://127.0.0.1:8000"

endpoints = [
    "/api/data/radar/status",
    "/api/data/radar/files",
    "/api/data/radar/scan",
    "/api/data/radar/alignment?roi_name=NATIONAL",
    "/api/data/radar/alignment?roi_name=AP_TELANGANA"
]

for ep in endpoints:
    url = base_url + ep
    print(f"\n=== Testing {ep} ===")
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print("Status Code:", resp.status)
            print("Response:", json.dumps(data, indent=2)[:350] + "...\n")
    except Exception as e:
        print("ERROR:", e)
