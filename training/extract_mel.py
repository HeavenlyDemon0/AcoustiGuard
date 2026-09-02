from pathlib import Path
import numpy as np
import pandas as pd
import librosa
import librosa.display
import matplotlib.pyplot as plt
from build_index import build_file_index

def extract_logmel(filepath, sr=16000, n_fft=1024, hop_length=512, n_mels=64):
    """
    Loads an audio (.wav) file and extracts its log-Mel spectrogram.

    Parameters:
        filepath (str or Path): Path to the audio file.
        sr (int): Target sampling rate in Hz. Default is 16000.
        n_fft (int): FFT window size. Default is 1024.
        hop_length (int): Number of audio samples between adjacent STFT columns. Default is 512.
        n_mels (int): Number of Mel frequency bands. Default is 64.

    Returns:
        np.ndarray: Log-Mel spectrogram array of natural shape (n_mels, T).
    """
    # Load audio file at target sampling rate
    y, _ = librosa.load(filepath, sr=sr)
    
    # Compute Mel spectrogram (power)
    S = librosa.feature.melspectrogram(
        y=y,
        sr=sr,
        n_fft=n_fft,
        hop_length=hop_length,
        n_mels=n_mels
    )
    
    # Convert power spectrogram to decibels (log-Mel)
    log_S = librosa.power_to_db(S, ref=np.max)
    
    return log_S


if __name__ == "__main__":
    fan_dir = r"D:\hackatronics\6_dB_fan"
    valve_dir = r"D:\hackatronics\6_dB_valve"
    
    print("Building file index...")
    df = build_file_index(fan_dir, valve_dir)
    
    # Select 3 random filepaths from DataFrame
    sample_files = df.sample(n=3, random_state=42).to_dict(orient="records")
    
    print("\n--- Testing extract_logmel on 3 random samples ---")
    log_mels = []
    for i, item in enumerate(sample_files, 1):
        fp = item["filepath"]
        log_mel = extract_logmel(fp)
        log_mels.append((item, log_mel))
        print(f"Sample {i}: [{item['machine_type']} | id_{item['machine_id']} | {item['label']}]")
        print(f"  Path: {fp}")
        print(f"  Spectrogram Shape: {log_mel.shape} (n_mels x T)\n")
    
    # Plot spectrogram for the first sampled audio clip using librosa.display.specshow
    sample_info, sample_log_mel = log_mels[0]
    
    plt.figure(figsize=(10, 4))
    librosa.display.specshow(
        sample_log_mel,
        sr=16000,
        hop_length=512,
        x_axis="time",
        y_axis="mel",
        cmap="viridis"
    )
    plt.colorbar(format="%+2.0f dB")
    plt.title(
        f"Log-Mel Spectrogram ({sample_info['machine_type'].upper()} - ID: {sample_info['machine_id']} - {sample_info['label'].upper()})\n"
        f"Shape: {sample_log_mel.shape}"
    )
    plt.tight_layout()
    
    save_path = "spectrogram_sample.png"
    plt.savefig(save_path, dpi=150)
    print(f"Saved spectrogram plot to {save_path}")
