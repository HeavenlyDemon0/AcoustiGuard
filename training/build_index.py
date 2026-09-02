from pathlib import Path
import pandas as pd

def build_file_index(fan_root, valve_root):
    """
    Scans MIMII dataset folder trees for fan and valve machine audio files (.wav)
    and returns a pandas DataFrame with metadata index.

    Parameters:
        fan_root (str or Path): Path to the 6_dB_fan directory.
        valve_root (str or Path): Path to the 6_dB_valve directory.

    Returns:
        pd.DataFrame: DataFrame containing columns ['filepath', 'machine_type', 'machine_id', 'label'].
    """
    fan_path = Path(fan_root)
    valve_path = Path(valve_root)
    
    records = []
    
    for root in [fan_path, valve_path]:
        root_path = Path(root)
        if not root_path.exists():
            print(f"Warning: Root directory does not exist: {root_path}")
            continue
            
        for wav_file in root_path.rglob("*.wav"):
            # Path structure: <root>/<machine>/id_<ID>/<status>/<filename>.wav
            # Parent folder represents status ('normal' or 'abnormal')
            status = wav_file.parent.name.lower()
            label = "anomaly" if status == "abnormal" else status
            
            # Machine ID folder e.g. 'id_00', 'id_02', ...
            machine_id_folder = wav_file.parent.parent.name
            machine_id = machine_id_folder.replace("id_", "") if machine_id_folder.startswith("id_") else machine_id_folder
            
            # Machine type folder e.g. 'fan' or 'valve'
            machine_type = wav_file.parent.parent.parent.name.lower()
            
            records.append({
                "filepath": str(wav_file.resolve()),
                "machine_type": machine_type,
                "machine_id": machine_id,
                "label": label
            })
            
    df = pd.DataFrame(records)
    return df


if __name__ == "__main__":
    fan_dir = Path(r"D:\hackatronics\6_dB_fan")
    valve_dir = Path(r"D:\hackatronics\6_dB_valve")
    
    df = build_file_index(fan_dir, valve_dir)
    
    print("=" * 50)
    print(f"Total audio files indexed: {len(df)}")
    print("=" * 50)
    
    print("\n--- machine_type .value_counts() ---")
    print(df["machine_type"].value_counts())
    
    print("\n--- machine_id .value_counts() ---")
    print(df["machine_id"].value_counts())
    
    print("\n--- label .value_counts() ---")
    print(df["label"].value_counts())
