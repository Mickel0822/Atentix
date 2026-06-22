$ErrorActionPreference = "Stop"

$ffmpegUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
$destination = "ffmpeg.zip"
$extractPath = "ffmpeg_temp"
$finalBinPath = "bin"

Write-Host "Downloading FFmpeg from $ffmpegUrl..."
Invoke-WebRequest -Uri $ffmpegUrl -OutFile $destination

Write-Host "Extracting FFmpeg..."
Expand-Archive -Path $destination -DestinationPath $extractPath -Force

Write-Host "Locating ffmpeg.exe..."
$ffmpegExe = Get-ChildItem -Path $extractPath -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1

if ($ffmpegExe) {
    if (-not (Test-Path $finalBinPath)) {
        New-Item -ItemType Directory -Path $finalBinPath | Out-Null
    }
    Move-Item -Path $ffmpegExe.FullName -Destination $finalBinPath -Force
    Write-Host "✅ FFmpeg installed to $finalBinPath\ffmpeg.exe"
} else {
    Write-Error "❌ Could not find ffmpeg.exe in the downloaded archive."
}

# Clean up
if (Test-Path $destination) { Remove-Item $destination }
if (Test-Path $extractPath) { Remove-Item $extractPath -Recurse }
