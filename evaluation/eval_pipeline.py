"""
Person C Evaluation & Calibration Module
-----------------------------------------
Provides clip anomaly scoring, conformal threshold calibration,
and ROC AUC / partial AUC metrics calculation for Rythm_Sense predictive coding model.

Module Contracts:
    compute_clip_score(model, spectrogram) -> float
    conformal_threshold(calibration_scores, alpha=0.05) -> float
"""

from pathlib import Path
import warnings
from typing import Union, Dict, Tuple, List, Optional
import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import roc_auc_score


# ============================================================
# CAUSAL TCN MODEL ARCHITECTURE (Person B State-Dict Compatible)
# ============================================================

class CausalConv1D(nn.Module):
    def __init__(self, in_channels: int, out_channels: int, kernel_size: int, dilation: int = 1):
        super().__init__()
        self.padding = (kernel_size - 1) * dilation
        self.conv = nn.Conv1d(
            in_channels=in_channels,
            out_channels=out_channels,
            kernel_size=kernel_size,
            dilation=dilation,
            padding=self.padding
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.conv(x)
        if self.padding > 0:
            x = x[:, :, :-self.padding]
        return x


class TCNBlock(nn.Module):
    def __init__(self, in_channels: int, out_channels: int, kernel_size: int = 3, dilation: int = 1):
        super().__init__()
        self.conv1 = CausalConv1D(in_channels, out_channels, kernel_size, dilation)
        self.conv2 = CausalConv1D(out_channels, out_channels, kernel_size, dilation)
        self.relu = nn.ReLU()

        if in_channels != out_channels:
            self.residual = nn.Conv1d(in_channels, out_channels, kernel_size=1)
        else:
            self.residual = nn.Identity()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = self.residual(x)
        x = self.conv1(x)
        x = self.relu(x)
        x = self.conv2(x)
        x = x + residual
        x = self.relu(x)
        return x


class CausalTCN(nn.Module):
    """
    Causal Temporal Convolutional Network for next-frame spectrogram prediction.
    Expects input shape: (batch, 64, 6) where 64 is n_mels and 6 is time context length.
    Produces output shape: (batch, 64) representing predicted next Mel frame.
    """
    def __init__(self, input_channels: int = 6, hidden_channels: int = 32, output_size: int = 1, kernel_size: int = 3):
        super().__init__()
        self.blocks = nn.ModuleList()
        dilations = [1, 2, 4, 8]

        self.blocks.append(
            TCNBlock(
                in_channels=input_channels,
                out_channels=hidden_channels,
                kernel_size=kernel_size,
                dilation=dilations[0]
            )
        )

        for dilation in dilations[1:]:
            self.blocks.append(
                TCNBlock(
                    in_channels=hidden_channels,
                    out_channels=hidden_channels,
                    kernel_size=kernel_size,
                    dilation=dilation
                )
            )

        self.output_layer = nn.Conv1d(
            in_channels=hidden_channels,
            out_channels=output_size,
            kernel_size=1
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Input shape: (batch, 64, 6) -> transpose to (batch, 6, 64)
        x = x.transpose(1, 2)
        for block in self.blocks:
            x = block(x)
        x = self.output_layer(x)
        x = x.squeeze(1)
        return x


# ============================================================
# MODEL LOADING AND NORMALIZATION UTILITIES
# ============================================================

def load_norm_stats(norm_stats_path: Union[str, Path]) -> Dict[str, float]:
    """
    Loads mean and std normalization statistics from an .npy file.

    Parameters:
        norm_stats_path (str or Path): Path to norm_stats_<id>.npy file.

    Returns:
        dict: {"mean": float, "std": float}
    """
    norm_path = Path(norm_stats_path)
    if not norm_path.exists():
        raise FileNotFoundError(f"Normalization stats file not found: '{norm_stats_path}'")

    stats = np.load(norm_path, allow_pickle=True).item()
    if not isinstance(stats, dict) or "mean" not in stats or "std" not in stats:
        raise ValueError(f"Invalid normalization stats structure in '{norm_stats_path}'. Expected dict with 'mean' and 'std'.")

    return {"mean": float(stats["mean"]), "std": float(stats["std"])}


def attach_norm_stats(model: CausalTCN, norm_stats: Dict[str, float]) -> CausalTCN:
    """
    Attaches normalization statistics directly to a CausalTCN model instance.

    Parameters:
        model (CausalTCN): Model instance.
        norm_stats (dict): Dict containing 'mean' and 'std'.

    Returns:
        CausalTCN: Same model instance with norm_stats, mean, std attributes attached.
    """
    if "mean" not in norm_stats or "std" not in norm_stats:
        raise ValueError("norm_stats dict must contain 'mean' and 'std' keys.")

    model.norm_stats = norm_stats
    model.mean = float(norm_stats["mean"])
    model.std = float(norm_stats["std"])
    return model


def load_tcn_model(
    checkpoint_path: Union[str, Path],
    norm_stats_path: Optional[Union[str, Path]] = None,
    device: Union[str, torch.device] = "cpu"
) -> CausalTCN:
    """
    Instantiates CausalTCN and loads trained state_dict weights from checkpoint_path.
    Optionally attaches machine-specific normalization statistics to model.

    Parameters:
        checkpoint_path (str or Path): Path to PyTorch .pt model checkpoint file.
        norm_stats_path (str or Path, optional): Path to machine-specific norm_stats_<id>.npy file.
        device (str or torch.device): Device to load model onto ('cpu' or 'cuda').

    Returns:
        CausalTCN: Loaded PyTorch model in eval mode.
    """
    ckpt_path = Path(checkpoint_path)
    if not ckpt_path.exists():
        raise FileNotFoundError(f"Checkpoint file not found: '{checkpoint_path}'")

    model = CausalTCN(input_channels=6, hidden_channels=32, output_size=1, kernel_size=3)
    checkpoint = torch.load(ckpt_path, map_location=device)

    if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
        model.load_state_dict(checkpoint["model_state_dict"])
    elif isinstance(checkpoint, dict):
        model.load_state_dict(checkpoint)
    else:
        raise ValueError(f"Unrecognized checkpoint format in '{checkpoint_path}'")

    if norm_stats_path is not None:
        stats = load_norm_stats(norm_stats_path)
        attach_norm_stats(model, stats)

    model.to(device)
    model.eval()
    return model


# ============================================================
# CONTRACT 3: COMPUTE CLIP ANOMALY SCORE
# ============================================================

def compute_clip_score(
    model: nn.Module,
    spectrogram: np.ndarray,
    context_len: int = 6,
    aggregation: str = "p95",
    device: Union[str, torch.device] = "cpu"
) -> float:
    """
    Computes a continuous clip-level anomaly score for a log-Mel spectrogram using predictive coding.

    Parameters:
        model (nn.Module): Trained CausalTCN model in eval mode.
        spectrogram (np.ndarray): Log-Mel spectrogram array of shape (64, T).
        context_len (int): Context window length in frames. Default is 6.
        aggregation (str): Aggregation method ('p95', 'mean', 'max', 'p90') across window MSE values. Default is 'p95'.
        device (str or torch.device): Target PyTorch device. Default is 'cpu'.

    Returns:
        float: Continuous clip anomaly score (finite float).

    Normalization Safety:
        - If model has attached attributes (model.mean and model.std or model.norm_stats),
          the spectrogram is normalized as S_norm = (spectrogram - mean) / (std + 1e-8).
        - If no normalization statistics are attached to model, a warning is issued, and input is treated
          as pre-normalized (intended only for controlled unit testing with pre-normalized data).

    Aggregation Method Rationale:
        'p95' aggregation computes the 95th percentile Mean Squared Error (MSE) across all sliding 6-frame windows
        in the clip. This filters out transient impulse click spikes while capturing sustained background prediction errors.
    """
    if not isinstance(spectrogram, np.ndarray):
        raise TypeError(f"spectrogram must be a numpy.ndarray, got {type(spectrogram)}")

    if spectrogram.ndim != 2 or spectrogram.shape[0] != 64:
        raise ValueError(f"spectrogram must have shape (64, T), got shape {spectrogram.shape}")

    n_mels, T = spectrogram.shape
    if T < context_len + 1:
        raise ValueError(
            f"spectrogram length T={T} is too short for context_len={context_len}; "
            f"requires at least context_len + 1 = {context_len + 1} frames."
        )

    # Check for attached normalization statistics on model
    if hasattr(model, "mean") and hasattr(model, "std") and model.mean is not None and model.std is not None:
        mean = float(model.mean)
        std = float(model.std)
        S_norm = (spectrogram - mean) / (std + 1e-8)
    elif hasattr(model, "norm_stats") and isinstance(model.norm_stats, dict):
        mean = float(model.norm_stats["mean"])
        std = float(model.norm_stats["std"])
        S_norm = (spectrogram - mean) / (std + 1e-8)
    else:
        warnings.warn(
            "No normalization stats (mean, std) attached to model instance. "
            "Assuming input spectrogram is already normalized. "
            "For real machine evaluation, load model with load_tcn_model(ckpt_path, norm_stats_path).",
            UserWarning
        )
        S_norm = spectrogram

    num_windows = T - context_len
    X_list = [S_norm[:, t : t + context_len] for t in range(num_windows)]
    y_list = [S_norm[:, t + context_len] for t in range(num_windows)]

    X_np = np.stack(X_list, axis=0)  # (num_windows, 64, 6)
    y_np = np.stack(y_list, axis=0)  # (num_windows, 64)

    X_tensor = torch.from_numpy(X_np).float().to(device)
    y_tensor = torch.from_numpy(y_np).float().to(device)

    model.eval()
    with torch.no_grad():
        y_pred = model(X_tensor)  # (num_windows, 64)

    # Per-window MSE across 64 Mel channels
    win_mse = torch.mean((y_pred - y_tensor) ** 2, dim=1).cpu().numpy()

    if aggregation == "p95":
        score = float(np.percentile(win_mse, 95))
    elif aggregation == "p90":
        score = float(np.percentile(win_mse, 90))
    elif aggregation == "mean":
        score = float(np.mean(win_mse))
    elif aggregation == "max":
        score = float(np.max(win_mse))
    else:
        raise ValueError(f"Unsupported aggregation '{aggregation}'. Supported options: 'p95', 'p90', 'mean', 'max'.")

    if not np.isfinite(score):
        raise ValueError(f"Computed clip anomaly score is non-finite: {score}")

    return score


def compute_clip_score_with_details(
    model: nn.Module,
    spectrogram: np.ndarray,
    context_len: int = 6,
    aggregation: str = "p95",
    device: Union[str, torch.device] = "cpu"
) -> Tuple[float, Dict[str, float]]:
    """
    Same as compute_clip_score, but returns a tuple of (score, details_dict)
    containing frame_error_min, frame_error_max, frame_error_mean, p95_score, win_mse.
    """
    if not isinstance(spectrogram, np.ndarray):
        raise TypeError(f"spectrogram must be a numpy.ndarray, got {type(spectrogram)}")

    if spectrogram.ndim != 2 or spectrogram.shape[0] != 64:
        raise ValueError(f"spectrogram must have shape (64, T), got shape {spectrogram.shape}")

    n_mels, T = spectrogram.shape
    if T < context_len + 1:
        raise ValueError(
            f"spectrogram length T={T} is too short for context_len={context_len}; "
            f"requires at least context_len + 1 = {context_len + 1} frames."
        )

    if hasattr(model, "mean") and hasattr(model, "std") and model.mean is not None and model.std is not None:
        mean = float(model.mean)
        std = float(model.std)
        S_norm = (spectrogram - mean) / (std + 1e-8)
    elif hasattr(model, "norm_stats") and isinstance(model.norm_stats, dict):
        mean = float(model.norm_stats["mean"])
        std = float(model.norm_stats["std"])
        S_norm = (spectrogram - mean) / (std + 1e-8)
    else:
        S_norm = spectrogram

    num_windows = T - context_len
    X_list = [S_norm[:, t : t + context_len] for t in range(num_windows)]
    y_list = [S_norm[:, t + context_len] for t in range(num_windows)]

    X_np = np.stack(X_list, axis=0)
    y_np = np.stack(y_list, axis=0)

    X_tensor = torch.from_numpy(X_np).float().to(device)
    y_tensor = torch.from_numpy(y_np).float().to(device)

    model.eval()
    with torch.no_grad():
        y_pred = model(X_tensor)

    win_mse = torch.mean((y_pred - y_tensor) ** 2, dim=1).cpu().numpy()
    score = float(np.percentile(win_mse, 95))

    details = {
        "frame_error_min": float(np.min(win_mse)),
        "frame_error_max": float(np.max(win_mse)),
        "frame_error_mean": float(np.mean(win_mse)),
        "p95_score": score,
        "win_mse": win_mse.tolist(),
    }

    return score, details



# ============================================================
# CONTRACT 3: CONFORMAL THRESHOLD CALIBRATION
# ============================================================

def conformal_threshold(
    calibration_scores: Union[List[float], np.ndarray],
    alpha: float = 0.05
) -> float:
    """
    Calculates the distribution-free Split Conformal Prediction threshold using held-out NORMAL calibration scores.

    Parameters:
        calibration_scores (list or np.ndarray): 1D array of anomaly scores computed strictly on held-out NORMAL calibration clips.
        alpha (float): Target significance level / false alarm rate in (0, 1). Default is 0.05.

    Returns:
        float: Conformal threshold q. Any test clip score > q is flagged as anomalous.

    Mathematical Formula & Rank Rule:
        Given n calibration scores s_1, s_2, ..., s_n from normal clips, and target significance level alpha in (0, 1):
        1. n = len(calibration_scores)
        2. Sort scores in non-decreasing order: s_(1) <= s_(2) <= ... <= s_(n)
        3. Rank index: k = ceil((n + 1) * (1 - alpha))
        4. Threshold: q = sorted_scores[min(k, n) - 1]  (converting 1-based rank k to 0-based array index)

        This guarantees finite-sample nominal coverage probability of 1 - alpha on future normal clips.
    """
    scores = np.asarray(calibration_scores, dtype=float)

    if scores.ndim != 1 or len(scores) == 0:
        raise ValueError("calibration_scores must be a non-empty 1D array or list.")

    if not (0.0 < alpha < 1.0):
        raise ValueError(f"alpha must be in range (0, 1), got {alpha}")

    n = len(scores)
    sorted_scores = np.sort(scores)

    # Rank formula: k = ceil((n + 1) * (1 - alpha))
    rank = int(np.ceil((n + 1) * (1.0 - alpha)))

    # Convert 1-based rank to 0-based array index, bounded by n-1
    idx = min(rank, n) - 1
    idx = max(idx, 0)

    threshold = float(sorted_scores[idx])
    return threshold


# ============================================================
# METRICS: ROC AUC AND PARTIAL AUC (pAUC)
# ============================================================

def compute_auc(
    y_true: Union[List[int], np.ndarray],
    y_scores: Union[List[float], np.ndarray]
) -> float:
    """
    Computes Receiver Operating Characteristic Area Under Curve (ROC AUC).

    Parameters:
        y_true (list or np.ndarray): Binary ground truth labels (0 = normal, 1 = anomaly).
        y_scores (list or np.ndarray): Continuous anomaly scores.

    Returns:
        float: ROC AUC score in [0.0, 1.0].
    """
    y_true = np.asarray(y_true)
    y_scores = np.asarray(y_scores)

    if len(y_true) != len(y_scores):
        raise ValueError(f"Length mismatch: len(y_true)={len(y_true)} vs len(y_scores)={len(y_scores)}")

    unique_classes = np.unique(y_true)
    if len(unique_classes) < 2:
        raise ValueError(f"compute_auc requires both normal (0) and anomaly (1) classes. Got classes: {unique_classes}")

    return float(roc_auc_score(y_true, y_scores))


def compute_pauc(
    y_true: Union[List[int], np.ndarray],
    y_scores: Union[List[float], np.ndarray],
    max_fpr: float = 0.1
) -> float:
    """
    Computes Partial ROC AUC (pAUC) integrated for False Positive Rate in [0, max_fpr]
    using sklearn standardization.

    Parameters:
        y_true (list or np.ndarray): Binary ground truth labels (0 = normal, 1 = anomaly).
        y_scores (list or np.ndarray): Continuous anomaly scores.
        max_fpr (float): Maximum FPR integration limit. Default is 0.1.

    Returns:
        float: Standardized Partial ROC AUC in [0.0, 1.0].
    """
    y_true = np.asarray(y_true)
    y_scores = np.asarray(y_scores)

    if len(y_true) != len(y_scores):
        raise ValueError(f"Length mismatch: len(y_true)={len(y_true)} vs len(y_scores)={len(y_scores)}")

    if not (0.0 < max_fpr <= 1.0):
        raise ValueError(f"max_fpr must be in range (0, 1], got {max_fpr}")

    unique_classes = np.unique(y_true)
    if len(unique_classes) < 2:
        raise ValueError(f"compute_pauc requires both normal (0) and anomaly (1) classes. Got classes: {unique_classes}")

    return float(roc_auc_score(y_true, y_scores, max_fpr=max_fpr))


# ============================================================
# PER-MACHINE ISOLATED EVALUATION HELPER
# ============================================================

def evaluate_machine_id(
    machine_id: str,
    checkpoint_path: Union[str, Path],
    norm_stats_path: Union[str, Path],
    calib_spectrograms: List[np.ndarray],
    test_spectrograms: List[np.ndarray],
    test_labels: List[int],
    alpha: float = 0.05,
    max_fpr: float = 0.1,
    device: Union[str, torch.device] = "cpu"
) -> Dict[str, Union[str, float, int]]:
    """
    Evaluates anomaly detection performance for a single machine ID in strict isolation.
    Machine IDs are NEVER pooled together.

    Parameters:
        machine_id (str): Machine identifier (e.g., 'fan_00', 'valve_02').
        checkpoint_path (str or Path): Path to PyTorch model checkpoint.
        norm_stats_path (str or Path): Path to machine-specific norm_stats_<id>.npy.
        calib_spectrograms (list[np.ndarray]): List of held-out NORMAL calibration spectrograms.
        test_spectrograms (list[np.ndarray]): List of test clip spectrograms.
        test_labels (list[int]): Binary test labels (0=normal, 1=anomaly).
        alpha (float): Significance level for conformal threshold. Default is 0.05.
        max_fpr (float): FPR upper bound for partial AUC. Default is 0.1.
        device (str or torch.device): Device to run inference on.

    Returns:
        dict: Evaluation results dictionary for the machine ID.
    """
    model = load_tcn_model(checkpoint_path=checkpoint_path, norm_stats_path=norm_stats_path, device=device)

    calib_scores = [compute_clip_score(model, spec, device=device) for spec in calib_spectrograms]
    threshold = conformal_threshold(calib_scores, alpha=alpha)

    test_scores = [compute_clip_score(model, spec, device=device) for spec in test_spectrograms]
    auc = compute_auc(test_labels, test_scores)
    pauc = compute_pauc(test_labels, test_scores, max_fpr=max_fpr)

    return {
        "machine_id": machine_id,
        "calib_count": len(calib_scores),
        "threshold": threshold,
        "auc": auc,
        "pauc": pauc,
        "test_count": len(test_scores)
    }
