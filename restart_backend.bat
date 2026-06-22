@echo off
echo Deteniendo procesos de Python antiguos...
taskkill /F /IM python.exe /T
taskkill /F /IM uvicorn.exe /T

echo Esperando un momento...
timeout /t 2 /nobreak >nul

echo Iniciando servidor backend...
cd backend
py -3.11 -m uvicorn main:app --reload --port 8000
pause
