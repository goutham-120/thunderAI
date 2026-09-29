"""
VAJRA-AI Model Audit & Metric Reproduction Script
Step-by-step diagnostic audit of saved model artifacts, ConvLSTM outputs, dataset leakage checks, and metric verification.
"""
import os
import sys
import json
import time
import numpy as np

backend_dir = r"c:\Users\nalla\OneDrive\Documents\Thunder\thunderAI\backend"
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.services.insat_3ds_processor import insat_processor, ROI_BOUNDS
import torch
import joblib

def audit_saved_artifacts():
    print("=== AUDIT STEP 1: INSPECT SAVED ARTIFACTS ===")
    report_path = r"c:\Users\nalla\OneDrive\Documents\Thunder\thunderAI\backend\app\weights\training_report.json"
    hgb_path = r"c:\Users\nalla\OneDrive\Documents\Thunder\thunderAI\backend\app\weights\vajra_hgb_nowcast.joblib"
    convlstm_path = r"c:\Users\nalla\OneDrive\Documents\Thunder\thunderAI\backend\app\weights\vajra_spatiotemporal_v1.pt"

    print(f"Report exists: {os.path.exists(report_path)}")
    print(f"HGB model exists: {os.path.exists(hgb_path)}")
    print(f"ConvLSTM checkpoint exists: {os.path.exists(convlstm_path)}")

    if os.path.exists(report_path):
        with open(report_path) as f:
            rep = json.load(f)
            print("\nSaved Training Report Summary:")
            print(json.dumps(rep, indent=2))

    if os.path.exists(convlstm_path):
        ckpt = torch.load(convlstm_path, map_location="cpu", weights_only=False)
        print("\nConvLSTM Checkpoint Keys:", list(ckpt.keys()))
        print("ConvLSTM Metadata:", ckpt.get("metadata", {}))

def audit_timestamps():
    print("\n=== AUDIT STEP 2: INSPECT TIMESTAMP SEQUENCES & TARGET DELTAS ===")
    inventory = insat_processor.scan_inventory()
    print(f"Found {len(inventory)} INSAT-3DS scans:")
    for idx, item in enumerate(inventory):
        print(f"  [{idx}] {item['filename']} | Time: {item['timestamp_iso']} | Gap from prev: {item.get('gap_minutes_from_prev', 0)} min")

    # Check exact valid pairs for +30m, +60m, +90m
    print("\nStrict Valid Time Horizon Pairs:")
    for i in range(len(inventory)):
        t_i = inventory[i]["timestamp_dt"]
        for j in range(i + 1, len(inventory)):
            t_j = inventory[j]["timestamp_dt"]
            dt_min = (t_j - t_i).total_seconds() / 60.0
            if abs(dt_min - 30.0) <= 5.0:
                print(f"  +30m Pair: Scan [{i}] ({inventory[i]['filename'][-20:-7]}) -> Scan [{j}] ({inventory[j]['filename'][-20:-7]}) (dt={dt_min:.1f}m)")
            elif abs(dt_min - 60.0) <= 5.0:
                print(f"  +60m Pair: Scan [{i}] ({inventory[i]['filename'][-20:-7]}) -> Scan [{j}] ({inventory[j]['filename'][-20:-7]}) (dt={dt_min:.1f}m)")
            elif abs(dt_min - 90.0) <= 5.0:
                print(f"  +90m Pair: Scan [{i}] ({inventory[i]['filename'][-20:-7]}) -> Scan [{j}] ({inventory[j]['filename'][-20:-7]}) (dt={dt_min:.1f}m)")

if __name__ == "__main__":
    audit_saved_artifacts()
    audit_timestamps()
