from pathlib import Path
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader

class MachineSoundDataset(Dataset):
    """
    PyTorch Dataset for loading windowed audio log-Mel spectrogram features (X)
    and target next-frames (y) for a specific machine ID.

    Parameters:
        machine_id (str): Machine ID identifier string (e.g., 'fan_00', 'valve_02').
        data_dir (str or Path): Directory containing windowed .npy files. Default is 'windowed_data'.
    """
    def __init__(self, machine_id, data_dir="windowed_data"):
        super().__init__()
        self.machine_id = machine_id
        self.data_dir = Path(data_dir)
        
        x_path = self.data_dir / f"X_{machine_id}.npy"
        y_path = self.data_dir / f"y_{machine_id}.npy"
        
        if not x_path.exists() or not y_path.exists():
            raise FileNotFoundError(f"Missing data files for machine_id '{machine_id}' in '{self.data_dir}'")
            
        # Load numpy arrays and convert to float32 torch tensors
        X_np = np.load(x_path)
        y_np = np.load(y_path)
        
        self.X = torch.from_numpy(X_np).float()
        self.y = torch.from_numpy(y_np).float()
        
    def __len__(self):
        return len(self.X)
        
    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]


def get_dataloader(machine_id, batch_size=64, shuffle=True, data_dir="windowed_data"):
    """
    Constructs a MachineSoundDataset for the specified machine_id and wraps it in a PyTorch DataLoader.

    Parameters:
        machine_id (str): Machine ID string (e.g., 'fan_00').
        batch_size (int): Number of samples per batch. Default is 64.
        shuffle (bool): Whether to shuffle dataset samples. Default is True.
        data_dir (str or Path): Directory path containing preprocessed .npy files. Default is 'windowed_data'.

    Returns:
        DataLoader: PyTorch DataLoader instance yielding (context, target) batches.
    """
    dataset = MachineSoundDataset(machine_id=machine_id, data_dir=data_dir)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=shuffle)
    return dataloader


if __name__ == "__main__":
    test_id = "fan_00"
    print(f"Building DataLoader for '{test_id}'...")
    loader = get_dataloader(test_id, batch_size=64, shuffle=True)
    
    # Pull one batch
    context_batch, target_batch = next(iter(loader))
    
    print("\n--- Batch Inspection ---")
    print(f"Machine ID: {test_id}")
    print(f"Context Batch Shape : {tuple(context_batch.shape)}")
    print(f"Target Batch Shape  : {tuple(target_batch.shape)}")
    print(f"Context Tensor Dtype: {context_batch.dtype}")
    print(f"Target Tensor Dtype : {target_batch.dtype}")
