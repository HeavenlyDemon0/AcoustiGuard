"""
Rythm Sense - Real ML Inference Integration

Contract 4:

predict(filepath, machine_id)
    -> (score, threshold, decision, spectrogram)

Pipeline:

WAV
  ↓
Person A - Log-Mel extraction
  ↓
Person B - TCN predictive coding
  ↓
Person C - P95 clip score
  ↓
Person C - Conformal calibration
  ↓
NORMAL / ANOMALY
"""

import sys
from pathlib import Path
from typing import Dict, Tuple

# Ensure project root, training, and evaluation are in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
TRAINING_DIR = ROOT_DIR / "training"
EVALUATION_DIR = ROOT_DIR / "evaluation"

for p in [str(ROOT_DIR), str(TRAINING_DIR), str(EVALUATION_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

import json
import numpy as np

from extract_mel import extract_logmel
from eval_pipeline import (
    load_tcn_model,
    compute_clip_score,
    compute_clip_score_with_details,
    conformal_threshold,
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = ROOT_DIR
MODEL_DIR = BASE_DIR / "model"
HANDOFF_DIR = BASE_DIR / "handoff_data"

CHECKPOINT_DIR = MODEL_DIR / "checkpoints"
NORM_STATS_DIR = MODEL_DIR / "norm_stats"
CALIBRATION_FILE = MODEL_DIR / "calibration" / "calibration_splits.json"


# ============================================================
# SUPPORTED MACHINES
# ============================================================

MACHINE_CONFIG = {
    "fan_00": {
        "machine_type": "Fan",

        "checkpoint":
            CHECKPOINT_DIR / "tcn_fan_00.pt",

        "norm_stats":
            NORM_STATS_DIR / "norm_stats_fan_00.npy",
    },

    "fan_02": {
        "machine_type": "Fan",

        "checkpoint":
            CHECKPOINT_DIR / "tcn_fan_02.pt",

        "norm_stats":
            NORM_STATS_DIR / "norm_stats_fan_02.npy",
    },

    "valve_00": {
        "machine_type": "Valve",

        "checkpoint":
            CHECKPOINT_DIR / "tcn_valve_00.pt",

        "norm_stats":
            NORM_STATS_DIR / "norm_stats_valve_00.npy",
    },

    "valve_02": {
        "machine_type": "Valve",

        "checkpoint":
            CHECKPOINT_DIR / "tcn_valve_02.pt",

        "norm_stats":
            NORM_STATS_DIR / "norm_stats_valve_02.npy",
    },
}


SUPPORTED_MACHINES = {
    "fan_00": "Fan",
    "fan_02": "Fan",
    "valve_00": "Valve",
    "valve_02": "Valve",
}


# ============================================================
# OPTIONAL FRONTEND COMPATIBILITY
# ============================================================

# Translate frontend UI IDs to real handoff machine IDs.

MACHINE_ALIASES = {
    "fan_id00": "fan_00",
    "fan_id02": "fan_02",
    "valve_id00": "valve_00",
    "valve_id02": "valve_02",
}


def normalize_machine_id(machine_id: str) -> str:

    machine_id = machine_id.strip().lower()

    return MACHINE_ALIASES.get(
        machine_id,
        machine_id,
    )


# ============================================================
# MODEL CACHE
# ============================================================

MODEL_CACHE = {}

THRESHOLD_CACHE = {}


# ============================================================
# LOAD CALIBRATION FILE
# ============================================================

def load_calibration_splits():

    if not CALIBRATION_FILE.exists():

        raise FileNotFoundError(
            f"Calibration file not found: {CALIBRATION_FILE}"
        )

    with open(
        CALIBRATION_FILE,
        "r",
        encoding="utf-8",
    ) as f:

        return json.load(f)


# ============================================================
# FIND CALIBRATION FILES
# ============================================================

def get_calibration_files(machine_id: str):

    data = load_calibration_splits()

    machine_id = normalize_machine_id(machine_id)

    # Handle common JSON structures.

    if machine_id in data:

        machine_data = data[machine_id]

    elif f"{machine_id}" in data:

        machine_data = data[f"{machine_id}"]

    else:

        raise KeyError(
            f"No calibration split found for {machine_id}"
        )


    # The handoff may store the paths under different keys.
    # Try the common forms.

    for key in [
        "normal",
        "normal_files",
        "calibration",
        "calibration_files",
        "files",
    ]:

        if key in machine_data:

            files = machine_data[key]

            if isinstance(files, list):

                return files


    # If the machine data itself is a list.

    if isinstance(machine_data, list):

        return machine_data


    raise ValueError(
        f"Unable to determine calibration files for {machine_id}"
    )


# ============================================================
# RESOLVE CALIBRATION PATH
# ============================================================

def resolve_calibration_path(path_value):

    p = Path(path_value)

    candidates = [
        # Already absolute or direct path.
        p,
        # Relative to repository root.
        BASE_DIR / p,
        # Relative to handoff_data.
        HANDOFF_DIR / p,
    ]

    # Try relative subpaths if path_value is an absolute path from another machine
    parts = p.parts
    for i in range(len(parts)):
        sub = Path(*parts[i:])
        candidates.extend([
            BASE_DIR / sub,
            BASE_DIR / "test_input" / sub,
            HANDOFF_DIR / sub,
        ])

    # Search by filename within test_input or BASE_DIR if subpaths don't match directly
    fname = p.name
    for search_root in [BASE_DIR / "test_input", HANDOFF_DIR, BASE_DIR]:
        if search_root.exists():
            matches = list(search_root.glob(f"**/{fname}"))
            if matches:
                candidates.append(matches[0])

    for candidate in candidates:
        try:
            if candidate.exists():
                return candidate.resolve()
        except Exception:
            continue

    raise FileNotFoundError(
        f"Calibration audio file not found: {path_value}"
    )


# ============================================================
# LOAD MODEL
# ============================================================

def get_model(machine_id: str):

    machine_id = normalize_machine_id(machine_id)

    if machine_id not in MACHINE_CONFIG:

        raise ValueError(
            f"Unsupported machine ID: {machine_id}"
        )


    if machine_id in MODEL_CACHE:

        return MODEL_CACHE[machine_id]


    config = MACHINE_CONFIG[machine_id]


    if not config["checkpoint"].exists():

        raise FileNotFoundError(
            f"Checkpoint not found: "
            f"{config['checkpoint']}"
        )


    if not config["norm_stats"].exists():

        raise FileNotFoundError(
            f"Normalization statistics not found: "
            f"{config['norm_stats']}"
        )


    print(
        f"[Rythm Sense] Loading model for {machine_id}"
    )


    model = load_tcn_model(
        str(config["checkpoint"]),
        str(config["norm_stats"]),
    )


    MODEL_CACHE[machine_id] = model


    return model


# ============================================================
# COMPUTE CALIBRATION THRESHOLD
# ============================================================

STATIC_FALLBACK_THRESHOLDS = {
    "fan_00": 0.046377,
    "fan_02": 0.041695,
    "valve_00": 0.009380,
    "valve_02": 0.016335,
}

def get_threshold(machine_id: str):

    machine_id = normalize_machine_id(machine_id)

    if machine_id in THRESHOLD_CACHE:
        return THRESHOLD_CACHE[machine_id]

    print(
        f"[Rythm Sense] Computing conformal threshold "
        f"for {machine_id}..."
    )

    model = get_model(machine_id)
    calibration_files = []
    try:
        calibration_files = get_calibration_files(machine_id)
    except Exception as e:
        print(f"[Rythm Sense] Warning: Could not load calibration splits for {machine_id}: {e}")

    calibration_scores = []

    for file_value in calibration_files:
        try:
            filepath = resolve_calibration_path(file_value)
            spectrogram = extract_logmel(filepath)
            score = compute_clip_score(model, spectrogram)
            calibration_scores.append(float(score))
        except FileNotFoundError:
            continue

    # Fallback to test_input normal files if calibration_splits paths are missing on cloned system
    if len(calibration_scores) == 0:
        normal_test_dir = BASE_DIR / "test_input" / machine_id / "normal"
        if normal_test_dir.exists():
            for fpath in sorted(normal_test_dir.glob("*.wav")):
                try:
                    spectrogram = extract_logmel(fpath)
                    score = compute_clip_score(model, spectrogram)
                    calibration_scores.append(float(score))
                except Exception:
                    continue

    if len(calibration_scores) == 0:
        print(f"[Rythm Sense] Using static fallback threshold for {machine_id}")
        threshold = STATIC_FALLBACK_THRESHOLDS.get(machine_id, 0.05)
    else:
        threshold = float(conformal_threshold(
            np.asarray(calibration_scores, dtype=np.float32),
            alpha=0.05,
        ))

    THRESHOLD_CACHE[machine_id] = threshold
    print(f"[Rythm Sense] {machine_id} threshold = {threshold:.6f}")
    return threshold


# ============================================================
# MAIN CONTRACT 4 FUNCTION
# ============================================================

def predict(
    filepath,
    machine_id: str,
) -> Tuple[
    float,
    float,
    str,
    np.ndarray,
]:

    machine_id = normalize_machine_id(
        machine_id
    )


    if machine_id not in MACHINE_CONFIG:

        raise ValueError(
            f"Unsupported machine ID '{machine_id}'. "
            f"Supported machines: {', '.join(MACHINE_CONFIG.keys())}."
        )


    filepath = Path(filepath)


    if not filepath.exists():

        raise FileNotFoundError(
            f"Audio file not found: {filepath}"
        )


    # --------------------------------------------------------
    # PERSON A
    # --------------------------------------------------------

    print(
        f"[Rythm Sense] "
        f"Extracting Log-Mel: {filepath.name}"
    )


    spectrogram = extract_logmel(
        filepath
    )


    # --------------------------------------------------------
    # PERSON B
    # --------------------------------------------------------

    model = get_model(
        machine_id
    )


    print(
        f"[Rythm Sense] "
        f"Running TCN inference: {machine_id}"
    )


    score, details = compute_clip_score_with_details(
        model,
        spectrogram,
    )

    score = float(score)

    # --------------------------------------------------------
    # PERSON C
    # --------------------------------------------------------

    threshold = get_threshold(
        machine_id
    )

    # --------------------------------------------------------
    # DECISION
    # --------------------------------------------------------

    if score > threshold:
        decision = "ANOMALY"
    else:
        decision = "NORMAL"

    try:
        cal_files = get_calibration_files(machine_id)
    except Exception:
        cal_files = []

    debug_log = {
        "machine_id": machine_id,
        "machine_type": MACHINE_CONFIG[machine_id]["machine_type"],
        "spectrogram_shape": list(spectrogram.shape),
        "norm_mean": float(getattr(model, "mean", 0.0)),
        "norm_std": float(getattr(model, "std", 1.0)),
        "frame_error_min": float(details["frame_error_min"]),
        "frame_error_max": float(details["frame_error_max"]),
        "frame_error_mean": float(details["frame_error_mean"]),
        "p95_score": float(score),
        "threshold": float(threshold),
        "calibration_file_count": len(cal_files),
        "margin": float(score - threshold),
        "decision": decision,
        "inference_time_ms": 0.0,
        # Additive: full per-frame MSE array for frontend animation (Stage 4).
        # win_mse was already computed by compute_clip_score_with_details;
        # this just exposes it instead of discarding it.
        "frame_errors": [float(e) for e in details.get("win_mse", [])],
    }

    print(
        f"[Rythm Sense] "
        f"Score={score:.6f} | "
        f"Threshold={threshold:.6f} | "
        f"Decision={decision}"
    )

    return (
        score,
        threshold,
        decision,
        spectrogram,
        debug_log,
    )


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    print(
        "Supported machines:"
    )

    for machine in MACHINE_CONFIG:

        print(
            f"  - {machine}"
        )

    print(
        "\nModel/threshold loading test..."
    )

    for machine in MACHINE_CONFIG:

        try:

            model = get_model(
                machine
            )

            threshold = get_threshold(
                machine
            )

            print(
                f"\n{machine}"
            )

            print(
                f"  Model: loaded"
            )

            print(
                f"  Threshold: {threshold:.6f}"
            )

        except Exception as exc:

            print(
                f"\n{machine} FAILED:"
            )

            print(
                f"  {exc}"
            )