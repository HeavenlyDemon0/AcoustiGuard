import json
from pathlib import Path
import pandas as pd
from sklearn.model_selection import train_test_split
from build_index import build_file_index

def create_calibration_splits(df, test_size=0.20, random_state=42, output_json="calibration_splits.json"):
    """
    Splits normal-label audio filepaths for each (machine_type, machine_id) pair into
    train and calibration sets, and saves the split dictionary to a JSON file.

    Parameters:
        df (pd.DataFrame): DataFrame containing columns ['filepath', 'machine_type', 'machine_id', 'label'].
        test_size (float): Proportion of dataset to include in the calibration split (0.15 to 0.20). Default is 0.20.
        random_state (int): Random seed for reproducible splitting. Default is 42.
        output_json (str or Path): Path to output JSON file. Default is 'calibration_splits.json'.

    Returns:
        dict: Nested dictionary containing train and calibration file list for each ID.
    """
    normal_df = df[df["label"] == "normal"]
    
    splits_dict = {}
    machines = ["fan", "valve"]
    ids = ["00", "02", "04", "06"]
    
    for machine in machines:
        for machine_id in ids:
            key = f"{machine}_{machine_id}"
            
            subset = normal_df[
                (normal_df["machine_type"] == machine) & 
                (normal_df["machine_id"] == machine_id)
            ]
            filepaths = subset["filepath"].tolist()
            
            train_files, calib_files = train_test_split(
                filepaths,
                test_size=test_size,
                random_state=random_state,
                shuffle=True
            )
            
            splits_dict[key] = {
                "train": train_files,
                "calibration": calib_files
            }
            
    # Save dictionary to JSON
    with open(output_json, "w") as f:
        json.dump(splits_dict, f, indent=2)
        
    print(f"Successfully created and saved splits to '{output_json}'\n")
    
    # Print counts for sanity check
    print("=" * 65)
    print(f"{'Machine ID':<12} | {'Train Files':<12} | {'Calib Files':<12} | {'Total Normal':<12}")
    print("=" * 65)
    for key, data in splits_dict.items():
        n_train = len(data["train"])
        n_calib = len(data["calibration"])
        n_total = n_train + n_calib
        print(f"{key:<12} | {n_train:<12d} | {n_calib:<12d} | {n_total:<12d}")
    print("=" * 65)
    
    return splits_dict


if __name__ == "__main__":
    fan_dir = r"D:\hackatronics\6_dB_fan"
    valve_dir = r"D:\hackatronics\6_dB_valve"
    
    df = build_file_index(fan_dir, valve_dir)
    splits = create_calibration_splits(df, test_size=0.20, random_state=42)
