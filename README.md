# AcoustiGuard — Rythm Sense
> **Industrial Acoustic Anomaly Detection for Rotating Equipment and Valves**

AcoustiGuard (Rythm Sense) is an unsupervised acoustic anomaly detection system built for industrial machinery diagnostics (fans and solenoid valves). It processes raw `.wav` audio recordings into 64-band Log-Mel spectrograms, passes them through a Causal Temporal Convolutional Network (TCN) predictive coding model to generate per-frame prediction errors, and computes a 95th-percentile (P95) clip anomaly score compared against an independently calibrated conformal threshold ($\tau_{\text{cal}}$) using Inductive Conformal Prediction (ICP).

---

## 📂 Repository Structure

```
.
├── README.md                 # Project overview, setup, and execution guide
├── start.bat                 # Optional 1-click Windows launcher for backend + frontend
├── .gitignore                # Git exclusions (node_modules, __pycache__, dist, .env)
├── model/                    # Calibrated model checkpoints, normalization stats & calibration splits
│   ├── checkpoints/          # PyTorch TCN model weights (tcn_fan_00.pt, tcn_fan_02.pt, etc.)
│   ├── norm_stats/           # Per-machine Log-Mel mean and standard deviation (.npy)
│   └── calibration/          # calibration_splits.json held-out normal reference set
├── training/                 # Feature extraction, dataset building, and TCN model training scripts
│   ├── extract_mel.py        # 64-channel Log-Mel spectrogram extractor (16kHz, hop=512)
│   ├── dataset_builder.py    # Sliding window spectrogram dataset generator
│   └── train_all_ids.py      # TCN auto-regressive model trainer
├── evaluation/               # Model evaluation & conformal threshold calibration module
│   ├── eval_pipeline.py      # P95 scoring, conformal threshold calculation & AUC/pAUC metrics
│   └── test_person_c.py      # Pytest verification suite for scoring & calibration
├── backend/                  # FastAPI inference API server
│   ├── app.py                # REST API endpoints (/predict, /health, /calibration-info)
│   ├── inference.py          # End-to-end ML inference pipeline coordinator
│   └── requirements.txt      # Python backend dependencies
├── frontend/                 # React 18 + TypeScript + Vite web dashboard
│   ├── src/                  # Components (PipelineViz, Spectrogram, PredictionErrorChart, etc.)
│   ├── public/               # Static web assets
│   └── package.json          # Node.js dependencies and script runner
└── handoff_data/             # Benchmark evaluation arrays and reference dataset metadata
```

---

## ⚙️ Setup Instructions

### 1. Backend Setup (Python 3.10+)
Install Python dependencies for the ML inference backend:
```bash
pip install -r backend/requirements.txt
```
*(Note: On modern Debian/Ubuntu systems, add `--break-system-packages` if prompted by pip).*

### 2. Frontend Setup (Node.js 18+)
Install Node package dependencies for the React dashboard:
```bash
cd frontend
npm install
cd ..
```

---

## 🚀 Running the Application

### Option A: Standard Two-Terminal Execution (Recommended)

**Terminal 1 — Start FastAPI ML Backend:**
```bash
python backend/app.py
cd backend
python app.py
```
*The API server will start on `http://localhost:8000` (FastAPI with Uvicorn).*

**Terminal 2 — Start Vite React Frontend:**
```bash
cd frontend
npm run dev
```
*The web dashboard will start on `http://localhost:5173`.*

Open your web browser and navigate to **`http://localhost:5173`**.

---

### Option B: One-Click Windows Convenience Launcher (Alternative)

Double-click `start.bat` or run it from Command Prompt:
```cmd
start.bat
```
*This launches both the backend and frontend servers simultaneously in separate terminal windows.*

---

## 🎯 Supported Machine Identifiers
## 🎯 Supported Machine Identifiers & Sample Test Inputs

The calibrated ML models support the following 4 industrial machine IDs:
1. **`fan_00`** (Industrial HVAC Blower #00 — Threshold $\tau = 0.054740$)
2. **`fan_02`** (Cooling Tower Fan #02 — Threshold $\tau = 0.096651$)
3. **`valve_00`** (High-Pressure Solenoid Valve #00 — Threshold $\tau = 0.344347$)
4. **`valve_02`** (Pneumatic Actuator Valve #02 — Threshold $\tau = 0.385139$)
1. **`fan_00`** (Industrial HVAC Blower #00 — Calibrated Threshold $\tau = 0.046377$)
2. **`fan_02`** (Cooling Tower Fan #02 — Calibrated Threshold $\tau = 0.041695$)
3. **`valve_00`** (High-Pressure Solenoid Valve #00 — Calibrated Threshold $\tau = 0.009380$)
4. **`valve_02`** (Pneumatic Actuator Valve #02 — Calibrated Threshold $\tau = 0.016335$)

### Audio File Requirement
- Audio input must be uncompressed **`.wav`** recordings (16,000 Hz sampling rate recommended, 5 to 10 seconds duration).
- Raw evaluation audio files are not included in the git repository. Testers/Judges can upload custom `.wav` files via the UI drag-and-drop zone or use the built-in quick-test recording buttons.
### Sample Audio Files (`test_input/`)
- Curated sample `.wav` audio files (10 normal, 10 abnormal per machine) are included directly in the repository under **`test_input/`**:
  - `test_input/fan_00/normal/*.wav` & `test_input/fan_00/abnormal/*.wav`
  - `test_input/fan_02/normal/*.wav` & `test_input/fan_02/abnormal/*.wav`
  - `test_input/valve_00/normal/*.wav` & `test_input/valve_00/abnormal/*.wav`
  - `test_input/valve_02/normal/*.wav` & `test_input/valve_02/abnormal/*.wav`
- Testers and Judges can drag and drop these sample files into the UI drag-and-drop zone to test live machine diagnostics.
