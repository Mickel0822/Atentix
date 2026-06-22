@echo off
echo Deteniendo Backend y Frontend...
echo.

REM Detener procesos de uvicorn
taskkill /F /IM uvicorn.exe 2>nul
if %errorlevel% equ 0 (
    echo Backend detenido.
) else (
    echo Backend no estaba ejecutandose.
)

REM Detener procesos de node (Next.js)
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo Frontend detenido.
) else (
    echo Frontend no estaba ejecutandose.
)

echo.
echo Servicios detenidos.
pause
