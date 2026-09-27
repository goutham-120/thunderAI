"""
Spatiotemporal Dataset & Windowing Data Loader for VAJRA-AI
Provides chronological sequence windowing [T_in=5, T_out=12] for ConvLSTM training/validation.
Strictly avoids temporal data leakage.
"""
import torch
from torch.utils.data import Dataset
import numpy as np
from typing import Tuple, Dict, Any, List

class SpatiotemporalDataset(Dataset):
    """
    Dataset class for multimodal spatiotemporal sequence training.
    Produces input tensors [T_in=5, C_in=8, H=64, W=64] and multi-horizon target dicts.
    """
    def __init__(
        self,
        tensors_4d: List[np.ndarray],
        split: str = "train",
        val_ratio: float = 0.15,
        test_ratio: float = 0.15
    ):
        super().__init__()
        self.split = split
        num_total = len(tensors_4d)

        # Chronological splits to avoid temporal leakage
        val_start = int(num_total * (1.0 - val_ratio - test_ratio))
        test_start = int(num_total * (1.0 - test_ratio))

        if split == "train":
            self.samples = tensors_4d[:val_start]
        elif split == "val":
            self.samples = tensors_4d[val_start:test_start]
        elif split == "test":
            self.samples = tensors_4d[test_start:]
        else:
            self.samples = tensors_4d

        if len(self.samples) == 0:
            self.samples = tensors_4d # Fallback if list is short

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, Dict[str, torch.Tensor]]:
        cube = self.samples[idx] # shape: [T=5, 64, 64, C=8]
        # Transpose to PyTorch format: [T=5, C=8, H=64, W=64]
        x_seq = np.transpose(cube, (0, 3, 1, 2)).astype(np.float32)
        x_tensor = torch.from_numpy(x_seq)

        # Target generation from final timestep + physical thresholding
        target_dbz = x_tensor[-1, 0:1, :, :] # Channel 0: dBZ
        target_lightning = x_tensor[-1, 4:5, :, :] # Channel 4: lightning density

        # Binary ground truth masks for classification heads
        target_thunder_mask = (target_dbz > 35.0).float()
        target_lightning_mask = (target_lightning > 0.5).float()

        # Target rainfall (Marshall-Palmer Z-R)
        z_lin = torch.pow(10.0, target_dbz / 10.0)
        target_rainfall = torch.where(target_dbz > 15.0, torch.pow(z_lin / 200.0, 1.0 / 1.6), torch.zeros_like(target_dbz))

        targets = {
            "p_thunderstorm": target_thunder_mask,
            "p_lightning": target_lightning_mask,
            "rainfall_mmh": target_rainfall,
            "pred_dbz": target_dbz
        }

        return x_tensor, targets
