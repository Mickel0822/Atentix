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
    Valida el token JWT de Supabase y devuelve el payload del usuario.
    NOTA: En un entorno de producción estricto, deberíamos validar la firma con la clave pública de Supabase.
    Para este MVP, decodificamos el JWT y confiamos en el endpoint de Supabase (o usamos el secreto si lo tenemos).
    Dado que usamos el `SUPABASE_KEY` (service role o anon), podríamos usar `supabase.auth.get_user(token)`.
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
