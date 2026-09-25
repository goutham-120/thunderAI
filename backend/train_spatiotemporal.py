"""
VAJRA-AI Spatiotemporal Model Training & Evaluation Pipeline
SIH Problem Statement 26072 - MoES / IMD

Trains the Multimodal ConvLSTM Spatiotemporal Network on 4D atmospheric tensors [T x H x W x C=8]
Computes loss, backpropagates gradients, and saves trained model weights to disk.
"""
import os
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from app.models.spatiotemporal_net import MultimodalSpatioTemporalModel
from app.services.data_harmonizer import harmonizer
from app.config import config

def generate_training_batch(batch_size: int = 8, seq_len: int = 5):
    """
    Generates synthetic realistic Indian convective storm episodes for training.
    Tensor shape: [Batch, T, Channels, Rows, Cols]
    """
    x_batch = []
    y_thunder_batch = []
    y_lightning_batch = []
    y_rain_batch = []
    y_dbz_batch = []

    rows = config.GRID_BOUNDS["grid_rows"]
    cols = config.GRID_BOUNDS["grid_cols"]

    for _ in range(batch_size):
        # Randomize storm trajectory, intensity, and location
        c_lat = np.random.uniform(16.0, 18.5)
        c_lon = np.random.uniform(77.0, 80.5)
        speed = np.random.uniform(15.0, 35.0)
        heading = np.random.uniform(100.0, 170.0)
        intensity = np.random.uniform(0.8, 1.25)

        cube = harmonizer.generate_synthetic_convective_cube(
            time_steps=seq_len + 1,
            storm_center=(c_lat, c_lon),
            storm_speed_kmh=speed,
            storm_heading_deg=heading,
            intensity_factor=intensity
        )
        tensor = cube["tensor"] # [6, 64, 64, 8]
        # Input sequence: T=0 to T=4
        x = tensor[:seq_len] # [5, 64, 64, 8]
        x = np.transpose(x, (0, 3, 1, 2)) # [5, 8, 64, 64]
        x_batch.append(x)

        # Target future frame: T=5
        y_frame = tensor[seq_len] # [64, 64, 8]
        y_dbz = y_frame[:, :, 0]
        y_sat = y_frame[:, :, 2]
        
        # Ground truth probabilistic masks
        p_thu = 1.0 / (1.0 + np.exp(-(y_dbz - 35.0) / 6.0))
        p_lig = np.where((y_dbz > 38.0) & (y_sat < 235.0), 0.92, 0.05)
        rain = np.where(y_dbz > 15.0, ((10.0 ** (y_dbz / 10.0)) / 200.0) ** (1.0 / 1.6), 0.0)

        y_thunder_batch.append(p_thu[np.newaxis, :, :])
        y_lightning_batch.append(p_lig[np.newaxis, :, :])
        y_rain_batch.append(rain[np.newaxis, :, :])
        y_dbz_batch.append(y_dbz[np.newaxis, :, :])

    return (
        torch.tensor(np.array(x_batch), dtype=torch.float32),
        torch.tensor(np.array(y_thunder_batch), dtype=torch.float32),
        torch.tensor(np.array(y_lightning_batch), dtype=torch.float32),
        torch.tensor(np.array(y_rain_batch), dtype=torch.float32),
        torch.tensor(np.array(y_dbz_batch), dtype=torch.float32)
    )

def train_vajra_model(epochs: int = 5, batches_per_epoch: int = 10):
    print("=" * 65)
    print(">>> Initializing VAJRA-AI Spatiotemporal Model Training...")
    print("=" * 65)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"* Compute Device: {device}")

    model = MultimodalSpatioTemporalModel(in_channels=8, hidden_channels=32).to(device)
    optimizer = optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-5)
    
    bce_loss_fn = nn.BCELoss()
    mse_loss_fn = nn.MSELoss()

    weights_dir = os.path.join(os.path.dirname(__file__), "app", "weights")
    os.makedirs(weights_dir, exist_ok=True)
    weights_path = os.path.join(weights_dir, "vajra_spatiotemporal_v1.pt")

    for epoch in range(1, epochs + 1):
        model.train()
        total_epoch_loss = 0.0

        for b in range(batches_per_epoch):
            x, y_thu, y_lig, y_rain, y_dbz = generate_training_batch(batch_size=4, seq_len=5)
            x = x.to(device)
            y_thu = y_thu.to(device)
            y_lig = y_lig.to(device)
            y_rain = y_rain.to(device)
            y_dbz = y_dbz.to(device)

            optimizer.zero_grad()
            preds = model(x)

            loss_thu = bce_loss_fn(preds["p_thunderstorm"], y_thu)
            loss_lig = bce_loss_fn(preds["p_lightning"], y_lig)
            loss_rain = mse_loss_fn(preds["rainfall_mmh"], y_rain) * 0.05
            loss_dbz = mse_loss_fn(preds["pred_dbz"], y_dbz) * 0.02

            total_loss = loss_thu + loss_lig + loss_rain + loss_dbz
            total_loss.backward()
            optimizer.step()

            total_epoch_loss += total_loss.item()

        avg_loss = total_epoch_loss / batches_per_epoch
        print(f"Epoch [{epoch}/{epochs}] - Loss: {avg_loss:.4f} (BCE: {(loss_thu+loss_lig).item():.3f}, MSE_dBZ: {loss_dbz.item():.3f})")

    # Save trained checkpoint
    torch.save(model.state_dict(), weights_path)
    print("=" * 65)
    print(f"[SUCCESS] Model Training Complete! Saved weights to: {weights_path}")
    print("=" * 65)

if __name__ == "__main__":
    train_vajra_model(epochs=3, batches_per_epoch=5)
