# Script para iniciar Backend y Frontend en la misma ventana
Write-Host "Iniciando Backend y Frontend..." -ForegroundColor Green
Write-Host ""

# Iniciar Backend en segundo plano
Write-Host "Iniciando Backend (FastAPI)..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\backend
    uvicorn main:app --reload
}

# Esperar un momento
Start-Sleep -Seconds 2

# Iniciar Frontend en segundo plano
Write-Host "Iniciando Frontend (Next.js)..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\frontend
    npm run dev
}

Write-Host ""
Write-Host "Backend y Frontend iniciados!" -ForegroundColor Green
Write-Host "Backend: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Presiona Ctrl+C para detener ambos servicios" -ForegroundColor Yellow
Write-Host ""

# Mostrar logs de ambos trabajos
try {
    while ($true) {
        # Mostrar logs del backend
        $backendOutput = Receive-Job -Job $backendJob -ErrorAction SilentlyContinue
        if ($backendOutput) {
            Write-Host "[BACKEND] $backendOutput" -ForegroundColor Magenta
        }
        
        # Mostrar logs del frontend
        $frontendOutput = Receive-Job -Job $frontendJob -ErrorAction SilentlyContinue
        if ($frontendOutput) {
            Write-Host "[FRONTEND] $frontendOutput" -ForegroundColor Blue
        }
        
        Start-Sleep -Milliseconds 500
    }
} finally {
    # Limpiar trabajos al salir
    Write-Host "Deteniendo servicios..." -ForegroundColor Yellow
    Stop-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
}
