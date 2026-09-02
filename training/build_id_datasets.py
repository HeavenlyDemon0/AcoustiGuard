import json
from pathlib import Path
import numpy as np
from extract_mel import extract_logmel
from dataset_builder import make_windows

def build_dataset_for_id(train_filepaths, context_len=6):
    """
    Extracts log-Mel spectrograms and sliding window features/targets for a list of training audio filepaths.

    Parameters:
        train_filepaths (list[str]): List of audio file paths for a single machine ID.
        context_len (int): Length of context window in time frames. Default is 6.

    Returns:
        tuple[np.ndarray, np.ndarray]:
            - X: Concatenated feature array of shape (num_windows, 64, context_len).
            - y: Concatenated target array of shape (num_windows, 64).
    """
    X_parts = []
    y_parts = []
    
    for filepath in train_filepaths:
        mel = extract_logmel(filepath)
        X_win, y_win = make_windows(mel, context_len=context_len)
        X_parts.append(X_win)
        y_parts.append(y_win)
        
    X = np.concatenate(X_parts, axis=0) if X_parts else np.empty((0, 64, context_len))
    y = np.concatenate(y_parts, axis=0) if y_parts else np.empty((0, 64))
    
    return X, y


def generate_all_windowed_datasets(json_path="calibration_splits.json", output_dir="windowed_data", context_len=6):
    """
    Reads calibration_splits.json, processes the training files for all 8 machine IDs,
    and saves X and y arrays as .npy files into output_dir.
    """
    json_path = Path(json_path)
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    
    with open(json_path, "r") as f:
        splits = json.load(f)
        
    print(f"Loaded splits from '{json_path}'. Processing {len(splits)} machine IDs...\n")
    
    for machine_key, file_dict in splits.items():
        train_files = file_dict["train"]
        print(f"Processing {machine_key} ({len(train_files)} train files)...")
        
        X_id, y_id = build_dataset_for_id(train_files, context_len=context_len)
        
        x_out_path = out_dir / f"X_{machine_key}.npy"
        y_out_path = out_dir / f"y_{machine_key}.npy"
        
        np.save(x_out_path, X_id)
        np.save(y_out_path, y_id)
        
        print(f"  --> Saved {x_out_path.name} (Shape: {X_id.shape})")
        print(f"  --> Saved {y_out_path.name} (Shape: {y_id.shape})\n")


if __name__ == "__main__":
    generate_all_windowed_datasets()
