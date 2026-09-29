@echo off
echo ================================================================
echo  VAJRA-AI: Multimodal Thunderstorm & Lightning Nowcasting Platform
echo  SIH 2026 Problem Statement 26072 - MoES / IMD
echo ================================================================
echo.

echo [1/2] Starting FastAPI Backend on http://localhost:8008 ...
start "VAJRA-AI Backend" cmd /k "cd backend && set PYTHONPATH=. && python -m uvicorn app.main:app --host 127.0.0.1 --port 8008 --reload"

timeout /t 3 /nobreak > nul

echo [2/2] Starting React + Vite Frontend on http://localhost:5123 ...
start "VAJRA-AI Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ================================================================
echo  VAJRA-AI is launching!
echo  Frontend: http://localhost:5123
echo  Backend API Docs: http://localhost:8008/docs
echo ================================================================
pause
