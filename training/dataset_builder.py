from pathlib import Path
import numpy as np
import pandas as pd
from extract_mel import extract_logmel
from build_index import build_file_index

def make_windows(spectrogram, context_len=6):
    """
    Slides a context window across the time axis of a log-Mel spectrogram to generate
    training pairs of context frames and target next-frame.

    Parameters:
        spectrogram (np.ndarray): Log-Mel spectrogram array of shape (64, T).
        context_len (int): Number of time frames in each context window. Default is 6.

    Returns:
        tuple[np.ndarray, np.ndarray]:
            - X: Context windows array of shape (num_windows, 64, context_len).
            - y: Target next-frame array of shape (num_windows, 64).
    """
    n_mels, T = spectrogram.shape
    num_windows = T - context_len
    
    if num_windows <= 0:
        return (
            np.empty((0, n_mels, context_len), dtype=spectrogram.dtype),
            np.empty((0, n_mels), dtype=spectrogram.dtype)
        )
        
    X_list = [spectrogram[:, t : t + context_len] for t in range(num_windows)]
    y_list = [spectrogram[:, t + context_len] for t in range(num_windows)]
    
    X = np.stack(X_list, axis=0)
    y = np.stack(y_list, axis=0)
    
    return X, y


def build_dataset(df, context_len=6):
    """
    Filters the input DataFrame for normal-label audio files, extracts log-Mel spectrograms,
    creates sliding window features/targets for each file, and stacks them into unified dataset arrays.

    Parameters:
        df (pd.DataFrame): DataFrame containing columns ['filepath', 'label', ...].
        context_len (int): Length of context window in frames. Default is 6.

    Returns:
        tuple[np.ndarray, np.ndarray]:
            - X_all: Concatenated feature windows array of shape (N_total, 64, context_len).
            - y_all: Concatenated target next-frames array of shape (N_total, 64).
    """
    normal_df = df[df["label"] == "normal"]
    print(f"Found {len(normal_df)} normal audio files for dataset construction.")
    
    X_parts = []
    y_parts = []
    
    total_files = len(normal_df)
    for idx, filepath in enumerate(normal_df["filepath"], 1):
        if idx % 1000 == 0 or idx == total_files:
            print(f"Processing file {idx}/{total_files}...")
            
        mel = extract_logmel(filepath)
        X, y = make_windows(mel, context_len=context_len)
        
        X_parts.append(X)
        y_parts.append(y)
        
    X_all = np.concatenate(X_parts, axis=0)
    y_all = np.concatenate(y_parts, axis=0)
    
    print("\n--- Final Dataset Shapes ---")
    print(f"X_all shape: {X_all.shape}")
    print(f"y_all shape: {y_all.shape}")
    
    return X_all, y_all


if __name__ == "__main__":
    fan_dir = r"D:\hackatronics\6_dB_fan"
    valve_dir = r"D:\hackatronics\6_dB_valve"
    
    print("Building file index...")
    df = build_file_index(fan_dir, valve_dir)
    
    print("\nBuilding dataset from normal clips...")
    X_all, y_all = build_dataset(df, context_len=6)
