# Script para reiniciar el servidor de desarrollo y limpiar caché

Write-Host "Limpiando caché de Next.js..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "✓ Caché eliminado" -ForegroundColor Green
} else {
    Write-Host "✓ No hay caché para eliminar" -ForegroundColor Green
}

Write-Host "`nIniciando servidor de desarrollo..." -ForegroundColor Yellow
Write-Host "Las rutas disponibles serán:" -ForegroundColor Cyan
Write-Host "  - http://localhost:3000/admin" -ForegroundColor White
Write-Host "  - http://localhost:3000/admin/usuarios" -ForegroundColor White
Write-Host "`nPresiona Ctrl+C para detener el servidor`n" -ForegroundColor Gray

npm run dev

