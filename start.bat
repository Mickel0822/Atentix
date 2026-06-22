@echo off
echo Iniciando Backend y Frontend...
echo.

REM Iniciar Backend con Python 3.11
start "Backend - FastAPI" cmd /k "cd backend && py -3.13 -m uvicorn main:app --reload"

REM Esperar un segundo para que el backend inicie
timeout /t 2 /nobreak >nul

REM Iniciar Frontend
start "Frontend - Next.js" cmd /k "cd frontend && npm run dev"

echo.
echo Backend y Frontend iniciados en ventanas separadas.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
pause
