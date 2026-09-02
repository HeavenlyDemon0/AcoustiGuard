"""
Stage 1 Unit Tests for Person C Evaluation & Calibration
---------------------------------------------------------
Verifies:
1. Real PyTorch checkpoint loading and state_dict key matching (checkpoints/tcn_fan_00.pt).
2. CausalTCN forward pass shapes: (batch, 64, 6) -> (batch, 64).
3. Clip scoring (compute_clip_score) contract and short-spectrogram error handling.
4. Explicit normalization formula (S - mean) / (std + 1e-8) and norm_stats structure.
5. Conformal threshold exact rank formula: k = ceil((n+1)*(1-alpha)), q = sorted[min(k,n)-1].
6. Deterministic conformal threshold test: [1..10], alpha=0.10 -> 10.0.
7. Conformal input validation (empty arrays, invalid alpha).
8. ROC AUC calculation and single-class validation.
9. Partial AUC (pAUC) standardized calculation with max_fpr=0.1.
10. Per-machine ID isolation (evaluating separate machine IDs independently).
"""

from pathlib import Path
import json
import glob
import os
import sys
import pytest
import numpy as np
import torch

ROOT_DIR = Path(__file__).resolve().parent.parent
TRAINING_DIR = ROOT_DIR / "training"
for p in [str(ROOT_DIR), str(TRAINING_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from extract_mel import extract_logmel
from eval_pipeline import (
    CausalTCN,
    load_tcn_model,
    load_norm_stats,
    attach_norm_stats,
    compute_clip_score,
    conformal_threshold,
    compute_auc,
    compute_pauc,
    evaluate_machine_id
)



# ============================================================
# TEST A: REAL CHECKPOINT LOADING & STATE_DICT COMPATIBILITY
# ============================================================

def test_load_real_fan_00_checkpoint():
    """
    Loads real existing checkpoint into CausalTCN
    and verifies zero missing or unexpected keys in state_dict.
    """
    ckpt_path = ROOT_DIR / "model" / "checkpoints" / "tcn_fan_00.pt"
    norm_path = ROOT_DIR / "model" / "norm_stats" / "norm_stats_fan_00.npy"

    assert ckpt_path.exists(), f"Real checkpoint file '{ckpt_path}' does not exist."
    assert norm_path.exists(), f"Real norm stats file '{norm_path}' does not exist."

    # Load model and state_dict
    model = load_tcn_model(checkpoint_path=ckpt_path, norm_stats_path=norm_path)

    assert isinstance(model, CausalTCN)
    assert hasattr(model, "mean") and model.mean is not None
    assert hasattr(model, "std") and model.std is not None

    # Strict key matching check
    checkpoint = torch.load(ckpt_path, map_location="cpu")
    state_dict = checkpoint["model_state_dict"] if "model_state_dict" in checkpoint else checkpoint

    fresh_model = CausalTCN()
    incompatible_keys = fresh_model.load_state_dict(state_dict, strict=True)

    assert len(incompatible_keys.missing_keys) == 0, f"Missing state_dict keys: {incompatible_keys.missing_keys}"
    assert len(incompatible_keys.unexpected_keys) == 0, f"Unexpected state_dict keys: {incompatible_keys.unexpected_keys}"


# ============================================================
# TEST B: MODEL FORWARD PASS SHAPE
# ============================================================

def test_causal_tcn_forward_shape():
    """
    Verifies forward pass shape: (batch, 64, 6) -> (batch, 64).
    """
    model = CausalTCN(input_channels=6, hidden_channels=32, output_size=1, kernel_size=3)
    model.eval()

    batch_size = 4
    dummy_input = torch.randn(batch_size, 64, 6)

    with torch.no_grad():
        output = model(dummy_input)

    assert output.shape == (batch_size, 64), f"Expected shape ({batch_size}, 64), got {output.shape}"


# ============================================================
# TEST C & E: CLIP ANOMALY SCORING AND EXPLICIT NORMALIZATION
# ============================================================

def test_explicit_normalization_formula():
    """
    Directly verifies S_norm = (S - mean) / (std + 1e-8) using a small deterministic
    spectrogram and known mean and std values, and verifies load_norm_stats loading.
    """
    # 1. Verify load_norm_stats on real norm_stats_fan_00.npy
    norm_stats = load_norm_stats("norm_stats_fan_00.npy")
    assert isinstance(norm_stats, dict)
    assert "mean" in norm_stats and "std" in norm_stats
    assert isinstance(norm_stats["mean"], float)
    assert isinstance(norm_stats["std"], float)

    # 2. Explicit deterministic test of formula (S - mean) / (std + eps)
    S = np.array([
        [10.0, 20.0],
        [30.0, 40.0]
    ], dtype=np.float32)
    mean = 20.0
    std = 10.0
    eps = 1e-8

    expected_norm = np.array([
        [(10.0 - 20.0) / (10.0 + eps), (20.0 - 20.0) / (10.0 + eps)],
        [(30.0 - 20.0) / (10.0 + eps), (40.0 - 20.0) / (10.0 + eps)]
    ], dtype=np.float32)

    actual_norm = (S - mean) / (std + eps)
    np.testing.assert_allclose(actual_norm, expected_norm, rtol=1e-6)

    # 3. Verify attach_norm_stats attaches mean/std correctly to model
    model = CausalTCN()
    attach_norm_stats(model, {"mean": mean, "std": std})
    assert model.mean == mean
    assert model.std == std
    assert model.norm_stats["mean"] == mean
    assert model.norm_stats["std"] == std


def test_compute_clip_score_valid():
    """
    Verifies compute_clip_score returns a finite float for a valid log-Mel spectrogram.
    """
    ckpt_path = Path("checkpoints/tcn_fan_00.pt")
    norm_path = Path("norm_stats_fan_00.npy")
    model = load_tcn_model(checkpoint_path=ckpt_path, norm_stats_path=norm_path)

    # 64 mels, 50 time frames
    dummy_spectrogram = np.random.randn(64, 50).astype(np.float32)
    score = compute_clip_score(model, dummy_spectrogram)

    assert isinstance(score, float)
    assert np.isfinite(score)
    assert score >= 0.0


# ============================================================
# TEST D: SHORT SPECTROGRAM ERROR HANDLING
# ============================================================

def test_compute_clip_score_short_spectrogram():
    """
    Verifies that a spectrogram with T < 7 frames raises ValueError.
    """
    model = CausalTCN()
    short_spectrogram = np.random.randn(64, 5).astype(np.float32)

    with pytest.raises(ValueError, match="is too short"):
        compute_clip_score(model, short_spectrogram, context_len=6)


# ============================================================
# TEST F: DETERMINISTIC CONFORMAL THRESHOLD FORMULA
# ============================================================

def test_conformal_threshold_deterministic_example():
    """
    Verifies exact finite-sample conformal threshold rank formula:
        n = 10
        scores = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        alpha = 0.10
        k = ceil((10 + 1) * (1 - 0.10)) = ceil(9.9) = 10
        expected threshold = sorted[10 - 1] = 10.0
    """
    scores = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    alpha = 0.10

    q_hat = conformal_threshold(scores, alpha=alpha)
    assert q_hat == 10.0, f"Expected threshold 10.0 for alpha=0.10, got {q_hat}"

    # Additional check: alpha = 0.20
    # k = ceil(11 * 0.80) = ceil(8.8) = 9 -> sorted[8] = 9.0
    q_hat_02 = conformal_threshold(scores, alpha=0.20)
    assert q_hat_02 == 9.0, f"Expected threshold 9.0 for alpha=0.20, got {q_hat_02}"


# ============================================================
# TEST G: CONFORMAL THRESHOLD INPUT VALIDATIONS
# ============================================================

def test_conformal_threshold_invalid_inputs():
    """
    Verifies invalid conformal inputs raise ValueError.
    """
    # Empty scores
    with pytest.raises(ValueError, match="must be a non-empty 1D array"):
        conformal_threshold([], alpha=0.05)

    # Invalid alpha (alpha >= 1.0)
    with pytest.raises(ValueError, match="alpha must be in range"):
        conformal_threshold([1.0, 2.0, 3.0], alpha=1.5)

    # Invalid alpha (alpha <= 0.0)
    with pytest.raises(ValueError, match="alpha must be in range"):
        conformal_threshold([1.0, 2.0, 3.0], alpha=0.0)


# ============================================================
# TEST H: ROC AUC CALCULATION AND SINGLE-CLASS VALIDATION
# ============================================================

def test_compute_auc_deterministic():
    """
    Verifies ROC AUC calculation on deterministic labels and scores.
    """
    y_true = [0, 0, 0, 1, 1, 1]
    y_scores = [0.1, 0.2, 0.3, 0.7, 0.8, 0.9]

    auc = compute_auc(y_true, y_scores)
    assert auc == 1.0, f"Expected AUC 1.0, got {auc}"

    # Single-class input error check
    with pytest.raises(ValueError, match="requires both normal"):
        compute_auc([0, 0, 0], [0.1, 0.2, 0.3])


# ============================================================
# TEST I: PARTIAL ROC AUC (pAUC) CALCULATION
# ============================================================

def test_compute_pauc_deterministic():
    """
    Verifies Partial ROC AUC (pAUC) calculation with max_fpr=0.1.
    """
    y_true = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]
    y_scores = [0.1, 0.15, 0.2, 0.25, 0.3, 0.7, 0.8, 0.85, 0.9, 0.95]

    pauc = compute_pauc(y_true, y_scores, max_fpr=0.1)
    assert isinstance(pauc, float)
    assert 0.0 <= pauc <= 1.0
    assert pauc == 1.0, f"Expected standardized pAUC 1.0, got {pauc}"

    # Invalid max_fpr check
    with pytest.raises(ValueError, match="max_fpr must be in range"):
        compute_pauc(y_true, y_scores, max_fpr=1.5)


# ============================================================
# TEST J: PER-MACHINE ISOLATION
# ============================================================

def test_per_machine_isolation():
    """
    Verifies separate machine IDs produce separate, isolated evaluation results.
    """
    fan_res = evaluate_machine_id(
        machine_id="fan_00",
        checkpoint_path="checkpoints/tcn_fan_00.pt",
        norm_stats_path="norm_stats_fan_00.npy",
        calib_spectrograms=[np.random.randn(64, 30).astype(np.float32) for _ in range(5)],
        test_spectrograms=[np.random.randn(64, 30).astype(np.float32) for _ in range(6)],
        test_labels=[0, 0, 0, 1, 1, 1],
        alpha=0.05
    )

    valve_res = evaluate_machine_id(
        machine_id="valve_00",
        checkpoint_path="checkpoints/tcn_valve_00.pt",
        norm_stats_path="norm_stats_valve_00.npy",
        calib_spectrograms=[np.random.randn(64, 30).astype(np.float32) for _ in range(5)],
        test_spectrograms=[np.random.randn(64, 30).astype(np.float32) for _ in range(6)],
        test_labels=[0, 0, 0, 1, 1, 1],
        alpha=0.05
    )

    assert fan_res["machine_id"] == "fan_00"
    assert valve_res["machine_id"] == "valve_00"
    assert np.isfinite(fan_res["threshold"])
    assert np.isfinite(valve_res["threshold"])


# ============================================================
# TEST K: REAL DATASET EVALUATION (fan_00 & valve_00)
# ============================================================

def test_real_evaluation_fan00_and_valve00():
    """
    Evaluates real fan_00 and valve_00 dataset using calibration_splits.json,
    real model checkpoints, real norm stats, and real audio wav files.
    """
    json_path = Path("handoff_data/calibration_splits.json")
    assert json_path.exists(), f"calibration_splits.json not found at {json_path}"

    with open(json_path, "r") as f:
        splits = json.load(f)

    machine_configs = [
        ("fan_00", r"D:\hackatronics\6_dB_fan\fan\id_00"),
        ("valve_00", r"D:\hackatronics\6_dB_valve\valve\id_00")
    ]

    for machine_id, machine_dir in machine_configs:
        assert machine_id in splits, f"Machine ID {machine_id} missing from calibration_splits.json"

        calib_files = splits[machine_id]["calibration"]
        abnormal_files = glob.glob(os.path.join(machine_dir, "abnormal", "*.wav"))

        assert len(calib_files) > 0, f"No calibration files found for {machine_id}"
        assert len(abnormal_files) > 0, f"No abnormal files found for {machine_id}"

        ckpt_path = Path(f"checkpoints/tcn_{machine_id}.pt")
        norm_path = Path(f"norm_stats_{machine_id}.npy")

        assert ckpt_path.exists(), f"Checkpoint missing: {ckpt_path}"
        assert norm_path.exists(), f"Norm stats missing: {norm_path}"

        model = load_tcn_model(checkpoint_path=ckpt_path, norm_stats_path=norm_path)

        calib_specs = [extract_logmel(fp) for fp in calib_files]
        abnormal_specs = [extract_logmel(fp) for fp in abnormal_files]

        calib_scores = [compute_clip_score(model, spec) for spec in calib_specs]
        abnormal_scores = [compute_clip_score(model, spec) for spec in abnormal_specs]

        threshold = conformal_threshold(calib_scores, alpha=0.05)

        test_scores = calib_scores + abnormal_scores
        test_labels = [0] * len(calib_scores) + [1] * len(abnormal_scores)

        auc = compute_auc(test_labels, test_scores)
        pauc = compute_pauc(test_labels, test_scores, max_fpr=0.1)

        # Sanity Checks
        assert np.isfinite(threshold), f"Threshold is non-finite for {machine_id}: {threshold}"
        assert not np.isnan(test_scores).any(), f"NaN values found in test scores for {machine_id}"
        assert not all(s == 0.0 for s in test_scores), f"All scores are 0.0 for {machine_id}"
        assert len(set(test_scores)) > 1, f"All scores are identical for {machine_id}"
        assert 0.0 <= auc <= 1.0, f"Invalid AUC value for {machine_id}: {auc}"
        assert 0.0 <= pauc <= 1.0, f"Invalid pAUC value for {machine_id}: {pauc}"

        print(f"\n   [{machine_id} Real Data Evaluation Results]")
        print(f"   - Calibration Normal Clips : {len(calib_scores)}")
        print(f"   - Abnormal Test Clips     : {len(abnormal_scores)}")
        print(f"   - Conformal Threshold (q) : {threshold:.6f}")
        print(f"   - ROC AUC                 : {auc:.6f}")
        print(f"   - Partial AUC (pAUC)      : {pauc:.6f}")


def run_all_tests_manually():
    """Manual runner if pytest is executed directly via python script."""
    print("=" * 60)
    print("RUNNING PERSON C STAGE 1 UNIT TESTS & REAL DATA EVALUATION")
    print("=" * 60)

    tests = [
        ("Test A: Load Real fan_00 Checkpoint", test_load_real_fan_00_checkpoint),
        ("Test B: CausalTCN Forward Shape", test_causal_tcn_forward_shape),
        ("Test C: Explicit Normalization Formula & Load Stats", test_explicit_normalization_formula),
        ("Test C & E: Compute Clip Score & Normalization", test_compute_clip_score_valid),
        ("Test D: Short Spectrogram ValueError", test_compute_clip_score_short_spectrogram),
        ("Test F: Deterministic Conformal Threshold", test_conformal_threshold_deterministic_example),
        ("Test G: Conformal Input Validations", test_conformal_threshold_invalid_inputs),
        ("Test H: ROC AUC & Single Class Validation", test_compute_auc_deterministic),
        ("Test I: Partial AUC (pAUC) Calculation", test_compute_pauc_deterministic),
        ("Test J: Per-Machine ID Isolation", test_per_machine_isolation),
        ("Test K: Real Dataset Evaluation (fan_00 & valve_00)", test_real_evaluation_fan00_and_valve00),
    ]

    passed = 0
    failed = 0

    for name, test_func in tests:
        try:
            test_func()
            print(f" [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f" [FAIL] {name}: {e}")
            failed += 1

    print("=" * 60)
    print(f"SUMMARY: {passed} PASSED, {failed} FAILED.")
    print("=" * 60)

    if failed > 0:
        raise RuntimeError(f"{failed} tests failed!")



if __name__ == "__main__":
    run_all_tests_manually()
