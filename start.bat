@echo off
echo ============================================================
echo Starting AcoustiGuard ML Inference Backend and React Dashboard
echo ============================================================
echo.

start "AcoustiGuard Backend (FastAPI)" cmd /k "python backend/app.py"
start "AcoustiGuard Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo Both services launched in separate windows!
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
