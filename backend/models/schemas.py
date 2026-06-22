from typing import Optional
from pydantic import BaseModel


# =====================================================
# Schemas de Autenticación
# =====================================================


class RegisterRequest(BaseModel):
    """Request para registro de usuario"""
    email: str
    password: str
    full_name: str
    role: int  # 1, 2 o 3 según constraint de la base de datos


class LoginRequest(BaseModel):
    """Request para login de usuario"""
    email: str
    password: str


class UserResponse(BaseModel):
    """Datos del usuario para respuesta"""
    user_id: str
    email: str
    full_name: str
    role: int
    confirmed: bool


class RegisterResponse(BaseModel):
    """Respuesta del endpoint de registro"""
    message: str
    user: UserResponse


class LoginResponse(BaseModel):
    """Respuesta del endpoint de login"""
    access_token: str
    token_type: str


# =====================================================
# Schemas de Detección
# =====================================================


class FaceDetectionRequest(BaseModel):
    image: str  # Imagen en Base64


class Coordinates(BaseModel):
    x: int
    y: int
    w: int
    h: int


class FaceDetectionResponse(BaseModel):
    detected: bool
    coordinates: Optional[Coordinates] = None
    confidence: float


class BlinkDetectionResponse(BaseModel):
    blinking: bool
    left_ear: float
    right_ear: float
