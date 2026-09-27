"""
ConvLSTM Model Trainer & Checkpoint Engine
Manages model training loops, validation monitoring, early stopping, reproducible seed control, and checkpoint saving.
"""
import os
import logging
import torch
import numpy as np
from typing import Dict, Any, Optional, List
from torch.utils.data import DataLoader
from app.models.spatiotemporal_net import MultimodalSpatioTemporalModel
from app.training.dataset import SpatiotemporalDataset
from app.training.losses import MultimodalTaskLoss
from app.training.evaluate import evaluate_model_predictions

logger = logging.getLogger("VAJRA-AI.Trainer")

class ConvLSTMTrainer:
    """
    Trainer class for PyTorch ConvLSTM Encoder-Decoder model.
    """
    def __init__(
        self,
        model: MultimodalSpatioTemporalModel,
        output_dir: Optional[str] = None,
        lr: float = 1e-3,
        seed: int = 42
    ):
        self.model = model
        self.output_dir = output_dir or os.path.join(os.path.dirname(__file__), "..", "weights")
        os.makedirs(self.output_dir, exist_ok=True)
        self.checkpoint_file = os.path.join(self.output_dir, "vajra_spatiotemporal_v1.pt")

        # Reproducibility Controls
        self.seed = seed
        torch.manual_seed(seed)
        np.random.seed(seed)

        self.loss_fn = MultimodalTaskLoss()
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr=lr)

    def train_epoch(self, dataloader: DataLoader) -> Dict[str, float]:
        self.model.train()
        total_loss = 0.0
        n_batches = 0

        for x_seq, targets in dataloader:
            self.optimizer.zero_grad()
            # Forward pass (30m lead time step = step 2)
            outputs_map = self.model(x_seq, horizons_min=[30])
            pred_30 = outputs_map[30]

            loss_dict = self.loss_fn(pred_30, targets)
            loss = loss_dict["total_loss"]

            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
            self.optimizer.step()

            total_loss += loss.item()
            n_batches += 1

        avg_loss = total_loss / max(1, n_batches)
        return {"loss": avg_loss}

    def validate(self, dataloader: DataLoader) -> Dict[str, float]:
        self.model.eval()
        total_loss = 0.0
        n_batches = 0

        all_thunder_true, all_thunder_pred = [], []
        all_light_true, all_light_pred = [], []

        with torch.no_grad():
            for x_seq, targets in dataloader:
                outputs_map = self.model(x_seq, horizons_min=[30])
                pred_30 = outputs_map[30]

                loss_dict = self.loss_fn(pred_30, targets)
                total_loss += loss_dict["total_loss"].item()
                n_batches += 1

                all_thunder_true.append(targets["p_thunderstorm"].cpu().numpy())
                all_thunder_pred.append(pred_30["p_thunderstorm"].cpu().numpy())
                all_light_true.append(targets["p_lightning"].cpu().numpy())
                all_light_pred.append(pred_30["p_lightning"].cpu().numpy())

        avg_loss = total_loss / max(1, n_batches)

        # Calculate metrics if batches exist
        metrics = {"val_loss": avg_loss}
        if n_batches > 0:
            y_thunder_t = np.concatenate(all_thunder_true, axis=0)
            y_thunder_p = np.concatenate(all_thunder_pred, axis=0)
            eval_res = evaluate_model_predictions(
                y_true_dict={"p_thunderstorm": y_thunder_t},
                y_pred_dict={"p_thunderstorm": y_thunder_p}
            )
            if "p_thunderstorm" in eval_res:
                for k, v in eval_res["p_thunderstorm"].items():
                    metrics[f"val_thunder_{k}"] = v

        return metrics

    def fit(
        self,
        train_loader: DataLoader,
        val_loader: DataLoader,
        epochs: int = 5,
        patience: int = 3
    ) -> Dict[str, Any]:
        """
        Runs complete training loop with validation monitoring, best-model checkpointing, and early stopping.
        """
        best_val_loss = float("inf")
        patience_counter = 0
        history = []

        logger.info(f"[Trainer] Starting ConvLSTM training for {epochs} epochs (Seed={self.seed})...")

        for epoch in range(1, epochs + 1):
            train_metrics = self.train_epoch(train_loader)
            val_metrics = self.validate(val_loader)
            val_loss = val_metrics["val_loss"]

            logger.info(f"Epoch {epoch}/{epochs} | Train Loss: {train_metrics['loss']:.4f} | Val Loss: {val_loss:.4f}")

            history.append({
                "epoch": epoch,
                "train_loss": train_metrics["loss"],
                "val_loss": val_loss,
                **val_metrics
            })

            # Checkpoint best model
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                patience_counter = 0
                self.save_checkpoint(
                    is_trained=True,
                    epoch=epoch,
                    val_loss=val_loss,
                    metrics=val_metrics
                )
            else:
                patience_counter += 1
                if patience_counter >= patience:
                    logger.info(f"[Trainer] Early stopping triggered at epoch {epoch}")
                    break

        return {
            "best_val_loss": best_val_loss,
            "epochs_completed": epoch,
            "checkpoint_path": self.checkpoint_file,
            "history": history
        }

    def save_checkpoint(
        self,
        is_trained: bool = True,
        epoch: int = 0,
        val_loss: float = 0.0,
        metrics: Optional[Dict[str, float]] = None
    ):
        """
        Saves full checkpoint dictionary with state_dict and rich metadata.
        """
        checkpoint_payload = {
            "state_dict": self.model.state_dict(),
            "metadata": {
                "is_trained": is_trained,
                "epoch": epoch,
                "val_loss": val_loss,
                "metrics": metrics or {},
                "backbone": "2-Layer ConvLSTM Encoder-Decoder",
                "in_channels": 8,
                "hidden_channels": 32
            }
        }
        torch.save(checkpoint_payload, self.checkpoint_file)
        logger.info(f"[Trainer] Checkpoint saved successfully to {self.checkpoint_file}")
