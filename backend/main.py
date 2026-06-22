from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.exceptions import setup_exception_handlers
from endpoints.routes import register_routes

from contextlib import asynccontextmanager
from services.gaze_model_loader import GazeModelLoader

@asynccontextmanager
async def lifespan(app: FastAPI):
    # NO cargar modelo al inicio para evitar timeout de puerto en Render
    # El modelo se cargará lazy en el primer request de gaze detection
    print("[Lifespan] Servidor iniciando (modelo L2CS-Net se cargará bajo demanda)...")
    yield
    # Clean up (optional)
    GazeModelLoader.unload()

# Crear instancia de FastAPI con configuración
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    lifespan=lifespan
)

# Configurar CORS para permitir peticiones desde el frontend
import os

# Determinar orígenes permitidos según el entorno
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://0.0.0.0:3000",
]

# En producción, agregar el dominio de Vercel
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    # Normalizar URL eliminando slash final
    frontend_url = frontend_url.rstrip('/')
    allowed_origins.append(frontend_url)
    # También agregar la versión con www si no la tiene
    if "https://" in frontend_url and not frontend_url.startswith("https://www."):
        allowed_origins.append(frontend_url.replace("https://", "https://www."))
    # Permitir variaciones comunes de Vercel (opcional, basado en prefijo)
    # Si frontend_url es algo como 'https://myapp.vercel.app', permitimos ese origin

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if not os.getenv("ALLOW_ALL_ORIGINS") else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurar manejadores de excepciones globales
setup_exception_handlers(app)

# Registrar todas las rutas
register_routes(app)

# Health check endpoint para Render
@app.get("/")
async def health_check():
    return {"status": "ok", "service": "detecion-atencion-backend"}
