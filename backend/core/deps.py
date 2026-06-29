from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from core.config import settings

# Esquema de seguridad Bearer
security = HTTPBearer()

def get_current_user_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Extrae el token del header Authorization.
    """
    return credentials.credentials

async def get_current_user(token: str = Depends(get_current_user_token)):
    """
    US-04: Control de acceso por rol - Valida el token JWT de Supabase para obtener el payload del usuario autenticado.
    El rol del usuario se encuentra embebido en `app_metadata.role` dentro de este payload, lo cual 
    permite a los endpoints realizar control de acceso basado en roles (RBAC).
    """
    try:
        # Opción 1: Validar decodificando (más rápido, requiere que SUPABASE_JWT_SECRET esté configurado si verificamos firma)
        # Por simplicidad y seguridad, usaremos el cliente de Supabase para validar el token.
        from supabase import create_client, Client
        from core.config import settings
        
        supabase: Client = create_client(settings.supabase_url, settings.supabase_key)
        
        # Obtenemos el usuario usando el token
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido o expirado",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return user_response.user

    except Exception as e:
        print(f"Error validating token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudo validar las credenciales",
            headers={"WWW-Authenticate": "Bearer"},
        )
