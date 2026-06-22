from fastapi import APIRouter

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
