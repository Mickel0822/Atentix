"""Descarga y valida los modelos necesarios para el monitoreo de atención."""
import urllib.request
from pathlib import Path
from typing import Optional

# URLs oficiales de MediaPipe
# Face Landmarker (Mesh + Blendshapes)
FACE_LANDMARKER_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"

# Face Detector (BlazeFace Short Range) - Renombrado localmente a face_detector.task para consistencia
FACE_DETECTOR_URL = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite"

# Copia versionada en el Space para recuperar el modelo si el contenedor no lo incluye.
L2CS_MODEL_URL = "https://huggingface.co/spaces/Mickel0822/detecion-atencion-backend/resolve/main/models/L2CSNet_gaze360.pkl"

MODEL_SOURCES = {
    "face_landmarker.task": FACE_LANDMARKER_URL,
    "face_detector.task": FACE_DETECTOR_URL,
    "L2CSNet_gaze360.pkl": L2CS_MODEL_URL,
}

MINIMUM_MODEL_SIZES = {
    "face_landmarker.task": 1_000_000,
    "face_detector.task": 100_000,
    "L2CSNet_gaze360.pkl": 50_000_000,
}

def get_models_dir() -> Path:
    """Retorna el directorio de modelos, creándolo si no existe."""
    backend_dir = Path(__file__).parent.parent
    models_dir = backend_dir / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    return models_dir

def is_valid_model(model_path: Path) -> bool:
    """Comprueba que el archivo exista y no sea un puntero o descarga incompleta."""
    minimum_size = MINIMUM_MODEL_SIZES.get(model_path.name, 1)
    return model_path.is_file() and model_path.stat().st_size >= minimum_size


def download_model(url: str, filename: str, force: bool = False) -> Optional[Path]:
    """Descarga un modelo desde una URL."""
    models_dir = get_models_dir()
    model_path = models_dir / filename
    
    if is_valid_model(model_path) and not force:
        print(f"[ModelDownloader] El modelo {filename} ya existe.")
        return model_path

    if model_path.exists():
        model_path.unlink()
    
    print(f"[ModelDownloader] Descargando {filename} desde {url}...")
    try:
        urllib.request.urlretrieve(url, str(model_path))
        if not is_valid_model(model_path):
            raise RuntimeError("El archivo descargado no cumple el tamaño mínimo esperado")
        print(f"[ModelDownloader] ✅ {filename} descargado exitosamente.")
        return model_path
    except Exception as e:
        print(f"[ModelDownloader] ❌ Error descargando {filename}: {e}")
        if model_path.exists():
            model_path.unlink()
        return None


def ensure_models() -> bool:
    """Garantiza que todos los modelos requeridos estén disponibles."""
    results = [
        download_model(url, filename)
        for filename, url in MODEL_SOURCES.items()
    ]
    return all(result is not None for result in results)

if __name__ == "__main__":
    if not ensure_models():
        raise SystemExit("No se pudieron preparar todos los modelos")
