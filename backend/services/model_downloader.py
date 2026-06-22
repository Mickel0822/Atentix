"""
Script para descargar los modelos necesarios de MediaPipe Tasks API.
Descarga face_landmarker.task y face_detector.task.
"""
import os
import urllib.request
from pathlib import Path

# URLs oficiales de MediaPipe
# Face Landmarker (Mesh + Blendshapes)
FACE_LANDMARKER_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"

# Face Detector (BlazeFace Short Range) - Renombrado localmente a face_detector.task para consistencia
FACE_DETECTOR_URL = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite"

def get_models_dir() -> Path:
    """Retorna el directorio de modelos, creándolo si no existe."""
    backend_dir = Path(__file__).parent.parent
    models_dir = backend_dir / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    return models_dir

def download_model(url: str, filename: str, force: bool = False) -> Path:
    """Descarga un modelo desde una URL."""
    models_dir = get_models_dir()
    model_path = models_dir / filename
    
    if model_path.exists() and not force:
        print(f"[ModelDownloader] El modelo {filename} ya existe.")
        return model_path
    
    print(f"[ModelDownloader] Descargando {filename} desde {url}...")
    try:
        urllib.request.urlretrieve(url, str(model_path))
        print(f"[ModelDownloader] ✅ {filename} descargado exitosamente.")
        return model_path
    except Exception as e:
        print(f"[ModelDownloader] ❌ Error descargando {filename}: {e}")
        # No re-lanzar para permitir que otros modelos intenten
        return None

if __name__ == "__main__":
    download_model(FACE_LANDMARKER_URL, "face_landmarker.task")
    download_model(FACE_DETECTOR_URL, "face_detector.task")
