"""
VAJRA-AI Training Script
Runs ConvLSTM model training pipeline, validates performance, and saves weight checkpoint to app/weights/vajra_spatiotemporal_v1.pt.
"""
import sys
import os
import torch
import numpy as np
from torch.utils.data import DataLoader

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from app.models.spatiotemporal_net import MultimodalSpatioTemporalModel
from app.services.data_harmonizer import harmonizer
from app.training.dataset import SpatiotemporalDataset
from app.training.trainer import ConvLSTMTrainer

def run_training_pipeline(epochs: int = 5, batch_size: int = 4):
    print("=" * 60)
    print("  VAJRA-AI CONVLSTM MODEL TRAINING PIPELINE")
    print("=" * 60)

    # 1. Generate multi-timestep convective spatiotemporal sequences
    print("[1/4] Generating spatiotemporal sequence training samples...")
    tensors = []
    centers = [(17.40, 78.48), (20.30, 85.82), (12.97, 77.59), (17.68, 83.20)]
    headings = [135.0, 115.0, 160.0, 90.0]

    for c, h in zip(centers, headings):
        for int_factor in [0.8, 1.0, 1.25]:
            # Generate fast synthetic 4D tensor [T=5, 64, 64, C=8]
            t_seq = []
            lon_grid, lat_grid = np.meshgrid(np.linspace(76.5, 81.5, 64), np.linspace(15.5, 19.5, 64))
            for step in range(5):
                dist_sq = (lat_grid - c[0])**2 + (lon_grid - c[1])**2
                base_dbz = 55.0 * int_factor * np.exp(-dist_sq / (2 * 0.35**2))
                rad_vel = -25.0 * np.sin((lon_grid - c[1]) * 8) * np.exp(-dist_sq / (2 * 0.5**2))
                sat_tir = 295.0 - (85.0 * int_factor * np.exp(-dist_sq / (2 * 0.7**2)))
                sat_wv = 245.0 - (35.0 * int_factor * np.exp(-dist_sq / (2 * 0.8**2)))
                lightning_density = np.clip((base_dbz - 35.0) / 30.0 * 18.0 * int_factor, 0.0, 25.0)
                nwp_cape = 2400.0 - 600.0 * np.exp(-dist_sq / (2 * 0.35**2))
                nwp_cin = np.clip(35.0 + 40.0 * np.cos(lon_grid * 4), 5.0, 120.0)
                nwp_shear = 18.0 + 8.0 * np.sin(lat_grid * 2)

                ch_stack = np.stack([base_dbz, rad_vel, sat_tir, sat_wv, lightning_density, nwp_cape, nwp_cin, nwp_shear], axis=-1)
                t_seq.append(ch_stack)

            tensors.append(np.stack(t_seq, axis=0))

    print(f"Generated {len(tensors)} 4D spatiotemporal sequence cubes [5 x 64 x 64 x 8].")

    # 2. Build Dataset & DataLoaders
    print("[2/4] Building train, validation, and test datasets...")
    train_ds = SpatiotemporalDataset(tensors, split="train", val_ratio=0.2, test_ratio=0.2)
    val_ds = SpatiotemporalDataset(tensors, split="val", val_ratio=0.2, test_ratio=0.2)
    test_ds = SpatiotemporalDataset(tensors, split="test", val_ratio=0.2, test_ratio=0.2)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False)

    print(f"Train samples: {len(train_ds)} | Val samples: {len(val_ds)} | Test samples: {len(test_ds)}")

    # 3. Instantiate ConvLSTM Model & Trainer
    print("[3/4] Initializing 2-Layer ConvLSTM Encoder-Decoder model...")
    model = MultimodalSpatioTemporalModel(in_channels=8, hidden_channels=32)
    trainer = ConvLSTMTrainer(model=model, lr=1e-3, seed=42)

    # 4. Train Model
    print(f"[4/4] Executing training loop ({epochs} epochs)...")
    results = trainer.fit(train_loader, val_loader, epochs=epochs, patience=3)

    print("\n" + "=" * 60)
    print("  TRAINING PIPELINE COMPLETE")
    print(f"  Best Val Loss: {results['best_val_loss']:.4f}")
    print(f"  Checkpoint:    {results['checkpoint_path']}")
    print("=" * 60)

    # Reload model inference engine to verify checkpoint loading
    from app.models.spatiotemporal_net import ai_engine
    ai_engine.load_checkpoint(results["checkpoint_path"])
    print(f"  Inference Engine Status: {ai_engine.model_status}")
    print(f"  Inference Engine Mode:   {ai_engine.inference_mode}")
    print("=" * 60)

if __name__ == "__main__":
    run_training_pipeline()
