import time
import json
from pathlib import Path
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, random_split

# Detect device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# ============================================================
# MODEL DEFINITIONS
# ============================================================

class CausalConv1D(nn.Module):
    def __init__(self, in_channels, out_channels, kernel_size, dilation=1):
        super().__init__()
        self.padding = (kernel_size - 1) * dilation
        self.conv = nn.Conv1d(
            in_channels=in_channels,
            out_channels=out_channels,
            kernel_size=kernel_size,
            dilation=dilation,
            padding=self.padding
        )

    def forward(self, x):
        x = self.conv(x)
        if self.padding > 0:
            x = x[:, :, :-self.padding]
        return x


class TCNBlock(nn.Module):
    def __init__(self, in_channels, out_channels, kernel_size=3, dilation=1):
        super().__init__()
        self.conv1 = CausalConv1D(in_channels, out_channels, kernel_size, dilation)
        self.conv2 = CausalConv1D(out_channels, out_channels, kernel_size, dilation)
        self.relu = nn.ReLU()

        if in_channels != out_channels:
            self.residual = nn.Conv1d(in_channels, out_channels, kernel_size=1)
        else:
            self.residual = nn.Identity()

    def forward(self, x):
        residual = self.residual(x)
        x = self.conv1(x)
        x = self.relu(x)
        x = self.conv2(x)
        x = x + residual
        x = self.relu(x)
        return x


class CausalTCN(nn.Module):
    def __init__(self, input_channels=6, hidden_channels=32, output_size=1, kernel_size=3):
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

    def forward(self, x):
        x = x.transpose(1, 2)
        for block in self.blocks:
            x = block(x)
        x = self.output_layer(x)
        x = x.squeeze(1)
        return x


# ============================================================
# TRAINING FUNCTION
# ============================================================

def train_model(
    model,
    train_loader,
    val_loader=None,
    epochs=20,
    lr=0.001,
    patience=5,
    checkpoint_path="best_model.pt"
):
    Path(checkpoint_path).parent.mkdir(parents=True, exist_ok=True)

    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)

    best_val_loss = float("inf")
    patience_counter = 0
    history = {"train_loss": [], "val_loss": []}

    model.to(device)

    for epoch in range(epochs):
        model.train()
        total_train_loss = 0.0

        for X_batch, y_batch in train_loader:
            X_batch = X_batch.to(device, non_blocking=True)
            y_batch = y_batch.to(device, non_blocking=True)

            optimizer.zero_grad()
            prediction = model(X_batch)
            loss = criterion(prediction, y_batch)
            loss.backward()
            optimizer.step()

            total_train_loss += loss.item()

        avg_train_loss = total_train_loss / len(train_loader)
        history["train_loss"].append(avg_train_loss)

        if val_loader is not None:
            model.eval()
            total_val_loss = 0.0

            with torch.no_grad():
                for X_batch, y_batch in val_loader:
                    X_batch = X_batch.to(device, non_blocking=True)
                    y_batch = y_batch.to(device, non_blocking=True)

                    prediction = model(X_batch)
                    loss = criterion(prediction, y_batch)
                    total_val_loss += loss.item()

            avg_val_loss = total_val_loss / len(val_loader)
            history["val_loss"].append(avg_val_loss)
        else:
            avg_val_loss = None

        if avg_val_loss is not None:
            print(
                f"Epoch {epoch + 1:03d}/{epochs} "
                f"| Train Loss: {avg_train_loss:.6f} "
                f"| Val Loss: {avg_val_loss:.6f}"
            )
        else:
            print(
                f"Epoch {epoch + 1:03d}/{epochs} "
                f"| Train Loss: {avg_train_loss:.6f}"
            )

        if avg_val_loss is not None:
            if avg_val_loss < best_val_loss:
                best_val_loss = avg_val_loss
                patience_counter = 0

                torch.save(
                    {
                        "model_state_dict": model.state_dict(),
                        "val_loss": best_val_loss,
                        "epoch": epoch + 1
                    },
                    checkpoint_path
                )
                print(f"   [+] Best model saved (val loss = {best_val_loss:.6f})")
            else:
                patience_counter += 1
                if patience_counter >= patience:
                    print(f"Early stopping triggered at epoch {epoch + 1}")
                    break

    return history, best_val_loss


class MachineSoundDataset(Dataset):
    def __init__(self, X_data, y_data):
        self.X = torch.from_numpy(X_data).float() if isinstance(X_data, np.ndarray) else X_data.float()
        self.y = torch.from_numpy(y_data).float() if isinstance(y_data, np.ndarray) else y_data.float()

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]


def main():
    machine_ids = [
        "fan_00", "fan_02", "fan_04", "fan_06",
        "valve_00", "valve_02", "valve_04", "valve_06"
    ]
    
    data_dir = Path("windowed_data")
    checkpoints_dir = Path("checkpoints")
    checkpoints_dir.mkdir(parents=True, exist_ok=True)
    
    summary_results = []
    
    print("=" * 70)
    print("STARTING 8-ID TCN MODEL TRAINING (WITH Z-SCORE NORMALIZATION)")
    print("=" * 70)
    
    for machine_id in machine_ids:
        x_file = data_dir / f"X_{machine_id}.npy"
        y_file = data_dir / f"y_{machine_id}.npy"
        checkpoint_path = checkpoints_dir / f"tcn_{machine_id}.pt"
        norm_stats_path = Path(f"norm_stats_{machine_id}.npy")
        
        print(f"\n==================================================")
        print(f"MACHINE ID: {machine_id}")
        print(f"==================================================")
        
        # Check if fan_00 or previous checkpoint already exists
        if checkpoint_path.exists() and norm_stats_path.exists() and machine_id == "fan_00":
            print(f"Found existing checkpoint & norm_stats for '{machine_id}'. Loading saved model state...")
            ckpt = torch.load(checkpoint_path, map_location="cpu")
            best_val = ckpt.get("val_loss", float("nan"))
            stats = np.load(norm_stats_path, allow_pickle=True).item()
            print(f"  --> Skipped retraining fan_00. Best Val Loss: {best_val:.6f} | Mean: {stats['mean']:.4f}, Std: {stats['std']:.4f}")
            summary_results.append({
                "machine_id": machine_id,
                "best_val_loss": best_val,
                "elapsed_sec": 596.72,
                "status": "Skipped (Existing Run)"
            })
            continue
            
        print(f"Loading {x_file.name} & {y_file.name}...")
        X_raw = np.load(x_file)
        y_raw = np.load(y_file)
        
        # Calculate mean and std per machine ID across X (flattened)
        mean = float(X_raw.mean())
        std = float(X_raw.std())
        
        print(f"Normalizing {machine_id}...")
        print(f"  Calculated Mean: {mean:.6f} | Std: {std:.6f}")
        
        np.save(norm_stats_path, {"mean": mean, "std": std})
        print(f"  Saved normalization stats to '{norm_stats_path}'")
        
        # Apply z-score normalization
        X_norm = (X_raw - mean) / (std + 1e-8)
        y_norm = (y_raw - mean) / (std + 1e-8)
        
        dataset = MachineSoundDataset(X_norm, y_norm)
        
        # 85/15 train/val split
        train_size = int(0.85 * len(dataset))
        val_size = len(dataset) - train_size
        
        train_ds, val_ds = random_split(
            dataset,
            [train_size, val_size],
            generator=torch.Generator().manual_seed(42)
        )
        
        train_loader = DataLoader(train_ds, batch_size=64, shuffle=True)
        val_loader = DataLoader(val_ds, batch_size=64, shuffle=False)
        
        model = CausalTCN(
            input_channels=6,
            hidden_channels=32,
            output_size=1,
            kernel_size=3
        )
        
        t0 = time.time()
        history, best_val = train_model(
            model=model,
            train_loader=train_loader,
            val_loader=val_loader,
            epochs=20,
            lr=0.001,
            patience=5,
            checkpoint_path=str(checkpoint_path)
        )
        t1 = time.time()
        
        elapsed = t1 - t0
        print(f"\n[+] {machine_id} Complete | Best Val Loss: {best_val:.6f} | Time: {elapsed:.2f}s ({elapsed/60:.2f}m)")
        
        summary_results.append({
            "machine_id": machine_id,
            "best_val_loss": best_val,
            "elapsed_sec": elapsed,
            "status": "Trained"
        })
        
    print("\n" + "=" * 70)
    print("FINAL 8-ID TRAINING SUMMARY TABLE")
    print("=" * 70)
    print(f"{'Machine ID':<12} | {'Best Val Loss':<15} | {'Elapsed Time':<18} | {'Status':<15}")
    print("-" * 70)
    for res in summary_results:
        print(
            f"{res['machine_id']:<12} | "
            f"{res['best_val_loss']:<15.6f} | "
            f"{res['elapsed_sec']:>6.2f}s ({res['elapsed_sec']/60:>4.2f}m)    | "
            f"{res['status']:<15}"
        )
    print("=" * 70)


if __name__ == "__main__":
    main()
