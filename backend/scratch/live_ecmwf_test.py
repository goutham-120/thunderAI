"""
Real Live Open-Meteo ECMWF API Request Script
Performs a live HTTP request to https://api.open-meteo.com/v1/ecmwf
"""
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.services.open_meteo.client import open_meteo_client
from app.services.open_meteo.validation import validate_open_meteo_response
from app.services.open_meteo.mapper import map_ecmwf_response_to_vajra

def run_live_test():
    print("=" * 70)
    print(">>> Performing REAL Open-Meteo ECMWF API Live Request...")
    print("=" * 70)

    res = open_meteo_client.fetch_ecmwf_forecast(latitude=17.68014, longitude=83.204254)
    print(f"* HTTP Success: {res['success']}")
    print(f"* Status Code: {res.get('status_code')}")
    print(f"* Latency: {res.get('latency_ms')} ms")
    print(f"* Hourly Records Received: {res.get('hourly_count')}")
    print(f"* Variables Count Received: {res.get('variables_count')}")

    is_valid, err = validate_open_meteo_response(res)
    print(f"* Schema Validation: {'PASSED' if is_valid else 'FAILED (' + str(err) + ')'}")

    if is_valid:
        mapped = map_ecmwf_response_to_vajra(res["data"])
        print("\n--- Parsed ECMWF Variables (Current Step) ---")
        for k, v in mapped["current_variables"].items():
            unit = mapped["units"].get(k, "")
            print(f"  - {k}: {v} {unit}")

        print("\n--- Provenance Metadata ---")
        print(json.dumps(mapped["provenance"], indent=2))
        print("\n--- Multimodal Sensor Isolation ---")
        print(json.dumps(mapped["multimodal_sensor_status"], indent=2))

if __name__ == "__main__":
    run_live_test()
