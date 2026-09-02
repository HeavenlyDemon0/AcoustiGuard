import time
from pathlib import Path
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, random_split

# Detect device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# ============================================================
# MODEL DEFINITIONS (from notebook)
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
        # Input shape: (batch, 64, 6) -> transpose to (batch, 6, 64)
        x = x.transpose(1, 2)

        for block in self.blocks:
            x = block(x)

        x = self.output_layer(x)
        x = x.squeeze(1)
        return x


# ============================================================
# TRAINING FUNCTION (from notebook)
# ============================================================

def train_model(
    model,
    train_loader,
    val_loader=None,
    epochs=50,
    lr=0.001,
    patience=7,
    checkpoint_path="best_model.pt"
):
    # Ensure checkpoint directory exists
    Path(checkpoint_path).parent.mkdir(parents=True, exist_ok=True)

    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)

    best_val_loss = float("inf")
    patience_counter = 0

    history = {
        "train_loss": [],
        "val_loss": []
    }

    model.to(device)

    for epoch in range(epochs):
        # --- TRAINING ---
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

        # --- VALIDATION ---
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

        # --- PRINT PROGRESS ---
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

        # --- EARLY STOPPING & CHECKPOINTING ---
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

    return history


# ============================================================
# DATASET DEFINITION & SCRIPT EXECUTION
# ============================================================

class MachineSoundDataset(Dataset):
    def __init__(self, X_data, y_data):
        if isinstance(X_data, (str, Path)):
            X_data = np.load(X_data)
            y_data = np.load(y_data)

        self.X = torch.from_numpy(X_data).float() if isinstance(X_data, np.ndarray) else X_data.float()
        self.y = torch.from_numpy(y_data).float() if isinstance(y_data, np.ndarray) else y_data.float()

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]


def main():
    data_dir = Path("windowed_data")
    x_file = data_dir / "X_fan_00.npy"
    y_file = data_dir / "y_fan_00.npy"

    print(f"Loading {x_file.name} and {y_file.name}...")
    X_raw = np.load(x_file)
    y_raw = np.load(y_file)

    # 1 & 2: Calculate mean and std across all of X (flattened)
    mean = float(X_raw.mean())
    std = float(X_raw.std())

    print(f"Normalizing features and targets...")
    print(f"  Calculated Mean: {mean:.6f} | Std: {std:.6f}")

    # 3: Save mean and std to norm_stats_fan_00.npy as a dict
    norm_stats_file = "norm_stats_fan_00.npy"
    np.save(norm_stats_file, {"mean": mean, "std": std})
    print(f"  Saved normalization stats to '{norm_stats_file}'")

    # 4: Apply z-score normalization
    X_norm = (X_raw - mean) / (std + 1e-8)
    y_norm = (y_raw - mean) / (std + 1e-8)

    # Create dataset using normalized arrays
    dataset = MachineSoundDataset(X_norm, y_norm)
    print(f"Total dataset samples: {len(dataset)}")

    # 85/15 train/val split with seed 42
    train_size = int(0.85 * len(dataset))
    val_size = len(dataset) - train_size

    train_dataset, val_dataset = random_split(
        dataset,
        [train_size, val_size],
        generator=torch.Generator().manual_seed(42)
    )

    print(f"Train samples: {len(train_dataset)} | Val samples: {len(val_dataset)}")

    # Build DataLoaders with batch_size=64
    train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=64, shuffle=False)

    # Instantiate fresh CausalTCN model
    model = CausalTCN(
        input_channels=6,
        hidden_channels=32,
        output_size=1,
        kernel_size=3
    )

    checkpoint_path = "checkpoints/tcn_fan_00.pt"
    epochs = 20
    lr = 0.001
    patience = 5

    print(f"\nStarting model training for {epochs} epochs (with normalized inputs)...")
    start_time = time.time()

    history = train_model(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        epochs=epochs,
        lr=lr,
        patience=patience,
        checkpoint_path=checkpoint_path
    )

    end_time = time.time()
    elapsed_seconds = end_time - start_time
    elapsed_minutes = elapsed_seconds / 60.0

    print("\n" + "=" * 50)
    print(f"Training Complete!")
    print(f"Total Elapsed Time: {elapsed_seconds:.2f} seconds ({elapsed_minutes:.2f} minutes)")
    print(f"Checkpoint saved to: {checkpoint_path}")
    print("=" * 50)


if __name__ == "__main__":
    main()
