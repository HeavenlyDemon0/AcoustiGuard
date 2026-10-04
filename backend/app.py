"""
Rythm Sense
FastAPI Inference Backend

React
  ↓
FastAPI
  ↓
inference.predict()
  ↓
Person A + B + C
  ↓
JSON
  ↓
React
"""

from pathlib import Path
import sys
import tempfile
import time
import logging
import os

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi import (
    FastAPI,
    File,
    UploadFile,
    Form,
    HTTPException,
)

from fastapi.middleware.cors import CORSMiddleware

from inference import (
    predict,
    SUPPORTED_MACHINES,
    normalize_machine_id,
    THRESHOLD_CACHE,
    get_threshold,
    get_calibration_files,
    preload_all_models,
)


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format=(
        "%(asctime)s | "
        "%(levelname)s | "
        "%(message)s"
    ),
)

logger = logging.getLogger(
    "rythm_sense"
)


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="Rythm Sense",
    description=(
        "Unsupervised Industrial Acoustic "
        "Anomaly Detection"
    ),
    version="1.0.0",
)


@app.on_event("startup")
def startup_event():
    logger.info("Initializing application startup — preloading models...")
    preload_all_models()


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "ok",

        "engine":
            "Rythm Sense ML Engine",

        "mock_mode":
            False,

        "supported_machines":
            list(SUPPORTED_MACHINES.keys()),
    }


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "name":
            "Rythm Sense",

        "status":
            "running",

        "pipeline":
            [
                "Log-Mel Spectrogram",
                "TCN Predictive Coding",
                "P95 Prediction Error",
                "Conformal Calibration",
            ],

        "machines":
            list(SUPPORTED_MACHINES.keys()),
    }


# ============================================================
# PREDICT
# ============================================================

@app.post("/predict")
async def predict_audio(

    file: UploadFile = File(...),

    machine_id: str = Form(...),
):

    start_time = time.perf_counter()


    # ========================================================
    # NORMALIZE MACHINE ID
    # ========================================================

    machine_id = normalize_machine_id(
        machine_id
    )


    # ========================================================
    # VALIDATE MACHINE
    # ========================================================

    if machine_id not in SUPPORTED_MACHINES:

        raise HTTPException(

            status_code=400,

            detail=(
                f"Unsupported machine ID: "
                f"{machine_id}. "
                f"Supported machines: "
                f"{', '.join(SUPPORTED_MACHINES.keys())}"
            ),
        )


    # ========================================================
    # VALIDATE FILE
    # ========================================================

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No filename supplied.",
        )


    if not file.filename.lower().endswith(
        ".wav"
    ):

        raise HTTPException(

            status_code=400,

            detail=(
                "Only WAV audio files are supported."
            ),
        )


    # ========================================================
    # READ FILE
    # ========================================================

    try:

        file_bytes = await file.read()

    except Exception as exc:

        logger.exception(
            "Unable to read uploaded file."
        )

        raise HTTPException(

            status_code=400,

            detail=(
                f"Unable to read audio file: "
                f"{exc}"
            ),
        )


    if not file_bytes:

        raise HTTPException(

            status_code=400,

            detail="Uploaded audio file is empty.",
        )


    # ========================================================
    # TEMPORARY AUDIO FILE
    # ========================================================

    temp_path = None


    try:

        with tempfile.NamedTemporaryFile(

            suffix=".wav",

            delete=False,

        ) as temp_file:

            temp_file.write(
                file_bytes
            )

            temp_path = Path(
                temp_file.name
            )


        logger.info(
            (
                "Running inference | "
                "machine=%s | "
                "file=%s"
            ),

            machine_id,

            file.filename,
        )


        # ====================================================
        # REAL CONTRACT 4
        # ====================================================

        score, threshold, decision, spectrogram, debug_log = predict(
            filepath=temp_path,
            machine_id=machine_id,
        )

        elapsed_ms = (
            time.perf_counter()
            - start_time
        ) * 1000

        debug_log["inference_time_ms"] = round(elapsed_ms, 2)

        spectrogram = spectrogram.astype(
            float
        )

        # Build per-frame error points for frontend charts and animation.
        # Each entry: { time, error, isAnomaly } — ~307 frames for a 10s clip at hop=512/16kHz.
        raw_frame_errors = debug_log.get("frame_errors", [])
        frame_errors_payload = [
            {
                "time": round(i * 512 / 16000, 4),
                "error": float(e),
                "isAnomaly": float(e) > threshold,
            }
            for i, e in enumerate(raw_frame_errors)
        ]

        response = {
            "machineId": machine_id,
            "machineType": SUPPORTED_MACHINES[machine_id],
            "machineLabel": f"{SUPPORTED_MACHINES[machine_id]} — {machine_id}",
            "acousticBehavior": (
                "Periodic / continuous acoustic behavior"
                if machine_id.startswith("fan")
                else "Event-driven / burst-like acoustic behavior"
            ),
            "anomalyScore": score,
            "threshold": threshold,
            "decisionMargin": score - threshold,
            "decision": decision,
            "debugLog": debug_log,
            "debug_log": debug_log,
            "frameErrors": frame_errors_payload,
            "spectrogram": {
                "timeBins": int(spectrogram.shape[1]),
                "freqBins": int(spectrogram.shape[0]),
                "timeAxis": [round(i * 512 / 16000, 4) for i in range(spectrogram.shape[1])],
                "freqAxis": [i for i in range(spectrogram.shape[0])],
                "data": spectrogram.tolist(),
            },
            "audioMetadata": {
                "filename": file.filename,
                "sampleRate": 16000,
                "channels": 1,
                "fileSize": f"{len(file_bytes) / 1024:.1f} KB",
            },
            "inferenceTimeMs": round(elapsed_ms, 2),
        }

        logger.info(
            (
                "Inference complete | "
                "machine=%s | "
                "score=%.6f | "
                "threshold=%.6f | "
                "decision=%s | "
                "time=%.2f ms"
            ),
            machine_id,
            score,
            threshold,
            decision,
            elapsed_ms,
        )

        return response


    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Inference failed.")
        raise HTTPException(
            status_code=500,
            detail=f"Inference failed: {str(exc)}",
        )
    finally:
        if temp_path is not None:
            try:
                temp_path.unlink(missing_ok=True)
            except Exception:
                pass


# ============================================================
# RECALIBRATE
# ============================================================

@app.post("/recalibrate")
@app.get("/recalibrate")
async def recalibrate_machine(machine_id: str = Form(None), machineId: str = Form(None)):
    mid = machine_id or machineId or "fan_00"
    norm_id = normalize_machine_id(mid)

    if norm_id not in SUPPORTED_MACHINES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported machine ID '{mid}'. Supported: {', '.join(SUPPORTED_MACHINES.keys())}"
        )

    # Force clear threshold cache for this machine ID
    THRESHOLD_CACHE.pop(norm_id, None)

    # Recompute threshold fresh from calibration split dataset
    threshold = get_threshold(norm_id)
    cal_files = get_calibration_files(norm_id)

    logger.info(f"Recalibrated {norm_id} conformal threshold = {threshold:.6f}")

    return {
        "status": "ok",
        "machineId": norm_id,
        "machine_id": norm_id,
        "threshold": float(threshold),
        "calibrationFileCount": len(cal_files),
        "calibration_file_count": len(cal_files),
        "message": f"Successfully recalibrated {norm_id} conformal threshold ({threshold:.6f}) from {len(cal_files)} calibration split files.",
    }


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    import os
    import uvicorn

    port = int(os.environ.get("PORT", 8000))

    uvicorn.run(

        "app:app",

        host="0.0.0.0",

        port=port,

        reload=False,
    )