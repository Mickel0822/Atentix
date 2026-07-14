from fastapi import APIRouter
from services.model_downloader import MINIMUM_MODEL_SIZES, get_models_dir, is_valid_model

router = APIRouter()


@router.get("/check/saludo")
async def saludo():
    """
    Endpoint que devuelve un saludo 'Hello World'
    """
    return {"mensaje": "Levantado"}


@router.get("/check/suma")
async def suma(a: int, b: int):
    """
    Endpoint de ejemplo que suma dos números
    """
    return {"resultado": a + b}


@router.get("/check/models")
async def models_status():
    """Informa si los modelos requeridos están listos en el contenedor."""
    models_dir = get_models_dir()
    models = {
        filename: {
            "ready": is_valid_model(models_dir / filename),
            "size": (models_dir / filename).stat().st_size
            if (models_dir / filename).is_file()
            else 0,
        }
        for filename in MINIMUM_MODEL_SIZES
    }
    return {
        "ready": all(model["ready"] for model in models.values()),
        "models": models,
    }
