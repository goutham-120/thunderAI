"""
Custom Loss Functions for VAJRA-AI Multimodal ConvLSTM Training
Implements:
1. Focal Loss for extreme class imbalance in thunderstorm & lightning detection
2. Weighted Smooth L1 / MSE Loss for continuous rainfall & dBZ outputs
3. Combined Multi-Task Loss Engine
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict

class FocalLoss(nn.Module):
    """
    Focal Loss for addressing class imbalance in spatial grids (severe convection is rare).
    FL(p_t) = -alpha * (1 - p_t)^gamma * log(p_t)
    """
    def __init__(self, alpha: float = 0.75, gamma: float = 2.0, eps: float = 1e-7):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.eps = eps

    def forward(self, pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        pred = torch.clamp(pred, self.eps, 1.0 - self.eps)
        pt = torch.where(target == 1, pred, 1.0 - pred)
        alpha_factor = torch.where(target == 1, self.alpha, 1.0 - self.alpha)
        focal_weight = alpha_factor * torch.pow(1.0 - pt, self.gamma)
        bce = -torch.log(pt)
        loss = focal_weight * bce
        return loss.mean()

class MultimodalTaskLoss(nn.Module):
    """
    Multi-Task Combined Loss for 4 meteorological output heads.
    """
    def __init__(
        self,
        w_thunder: float = 1.0,
        w_lightning: float = 1.2,
        w_rainfall: float = 0.5,
        w_dbz: float = 0.5
    ):
        super().__init__()
        self.w_thunder = w_thunder
        self.w_lightning = w_lightning
        self.w_rainfall = w_rainfall
        self.w_dbz = w_dbz

        self.focal_thunder = FocalLoss(alpha=0.75, gamma=2.0)
        self.focal_lightning = FocalLoss(alpha=0.85, gamma=2.0)
        self.smooth_l1 = nn.SmoothL1Loss()

    def forward(self, predictions: Dict[str, torch.Tensor], targets: Dict[str, torch.Tensor]) -> Dict[str, torch.Tensor]:
        l_thunder = self.focal_thunder(predictions["p_thunderstorm"], targets["p_thunderstorm"])
        l_lightning = self.focal_lightning(predictions["p_lightning"], targets["p_lightning"])
        l_rainfall = self.smooth_l1(predictions["rainfall_mmh"], targets["rainfall_mmh"])
        l_dbz = self.smooth_l1(predictions["pred_dbz"], targets["pred_dbz"])

        total_loss = (
            self.w_thunder * l_thunder +
            self.w_lightning * l_lightning +
            self.w_rainfall * l_rainfall +
            self.w_dbz * l_dbz
        )

        return {
            "total_loss": total_loss,
            "loss_thunderstorm": l_thunder,
            "loss_lightning": l_lightning,
            "loss_rainfall": l_rainfall,
            "loss_dbz": l_dbz
        }
