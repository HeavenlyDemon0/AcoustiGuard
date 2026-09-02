# AcoustiGuard / Rythm Sense — Python ML Inference Backend

This directory contains the lightweight Python API backend for **AcoustiGuard**. It bridges the React frontend with the acoustic anomaly detection pipeline.

---

## ML Pipeline Architecture

```
WAV AUDIO
    ↓
Log-Mel Spectrogram (Person A)
    ↓
TCN Predictive Coding (Person B)
    ↓
Temporal Prediction Error (Person B)
    ↓
Clip-Level Anomaly Score (Person B)
    ↓
Per-Machine-ID Conformal Calibration (Person C)
    ↓
Machine-Specific Threshold (Person C)
    ↓
NORMAL / ANOMALY Decision
```

---

## Quickstart

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Launch Development API Server
```bash
python -m uvicorn app:app --port 8000 --reload
```

The backend server will run at `http://localhost:8000`.

---

## API Contract Documentation

### 1. Health Check Endpoint
- **URL**: `GET /health`
- **Response**:
```json
{
  "status": "ok",
  "engine": "AcoustiGuard ML Engine v0.1",
  "mock_mode": false,
  "supported_machines": ["fan_id00", "fan_id02", "valve_id00", "valve_id02"]
}
```

### 2. Inference Endpoint
- **URL**: `POST /predict`
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file`: WAV audio file (Binary)
  - `machine_id`: Target machine ID (`fan_id00`, `fan_id02`, `valve_id00`, `valve_id02`)

- **Expected Response**:
```json
{
  "machineId": "fan_id00",
  "machineType": "Fan",
  "machineLabel": "Fan — fan_id00 (Industrial HVAC Blower #00)",
  "acousticBehavior": "Periodic / continuous acoustic behavior",
  "anomalyScore": 0.0342,
  "threshold": 0.0210,
  "decisionMargin": 0.0132,
  "decision": "ANOMALY",
  "spectrogram": {
    "timeBins": 100,
    "freqBins": 64,
    "timeAxis": [0.0, 0.1, 0.2, "..."],
    "freqAxis": [50, 175, 300, "..."],
    "data": [[0.05, 0.12, "..."], "..."]
  },
  "frameErrors": [
    { "time": 0.0, "error": 0.012, "isAnomaly": false },
    { "time": 4.5, "error": 0.048, "isAnomaly": true }
  ],
  "anomalyRegions": [
    {
      "startTime": 4.2,
      "endTime": 7.0,
      "peakError": 0.052,
      "description": "High temporal residual error spike exceeding calibrated threshold (0.0210)."
    }
  ],
  "audioMetadata": {
    "filename": "fan_id00_sample.wav",
    "duration": 10.0,
    "sampleRate": 16000,
    "channels": 1,
    "snr": "+6 dB",
    "fileSize": "312.5 KB"
  },
  "inferenceTimeMs": 350
}
```

---

## Integration Instructions for Team Members

- **Person A (Preprocessing)**: Plug PyTorch/librosa Log-Mel feature extraction into `preprocess_log_mel()` inside `inference.py`.
- **Person B (TCN Model)**: Load trained model weights (`.pt` / `.onnx`) into `run_tcn_model()` inside `inference.py`.
- **Person C (Calibration & Evaluation)**: Update `DEFAULT_THRESHOLDS` inside `inference.py` and evaluation benchmarks in `src/data/mockEvaluation.ts`.
