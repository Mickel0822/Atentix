"""
Endpoints de autenticación usando Supabase.
"""
from fastapi import APIRouter, HTTPException, status
from supabase import Client

from models.schemas import (
    RegisterRequest,
    RegisterResponse,
    UserResponse,
)
from utils.supabase_client import get_supabase_client

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    """
    Registra un nuevo usuario en Supabase Auth (auth.users).
    
    Args:
        request: Datos del usuario a registrar (email, password, full_name, role)
        
    Returns:
        RegisterResponse: Datos del usuario creado
        
    Raises:
        HTTPException: Si el usuario ya existe, datos inválidos, o error en la creación
    """
    # Validar el rol antes de tocar Supabase.
    if request.role not in [1, 2, 3]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El role debe ser 1, 2 o 3"
        )
    
    supabase: Client = get_supabase_client()
    
    try:
        # Se valida profiles como resguardo adicional para evitar duplicados.
        existing_user = supabase.table("profiles").select("email").eq("email", request.email).execute()
        
        if existing_user.data and len(existing_user.data) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El usuario con este email ya está registrado en el sistema"
            )
        
        # 1. Crear usuario en Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {
                    "full_name": request.full_name
                }
            }
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al crear el usuario en Supabase Auth"
            )
        
        user_id = auth_response.user.id
        
        # Se crea el perfil de forma explícita para no depender solo de triggers.
        try:
            profile_data = {
                "user_id": user_id,
                "full_name": request.full_name,
                "email": request.email,
                "role": request.role,
                "is_active": True,
                "ctr_estado": 1
            }
            # El upsert mantiene consistencia si el trigger ya generó el registro.
            supabase.table("profiles").upsert(profile_data).execute()
            print(f"[Register] ✅ Perfil creado explícitamente para {user_id}")
        except Exception as profile_error:
            print(f"[Register] ⚠️ Error creando perfil explícitamente: {profile_error}")
            # No bloqueamos el flujo, pero lo logueamos. Si falla por FK, los siguientes pasos fallarán.

        # Se intenta reflejar el rol en app_metadata cuando la clave lo permite.
        try:
            if hasattr(supabase.auth, 'admin') and supabase.auth.admin:
                supabase.auth.admin.update_user_by_id(
                    user_id,
                    {"app_metadata": {"role": request.role}}
                )
                print(f"[Register] ✅ Role {request.role} asignado vía Admin API")
            else:
                print("[Register] ⚠️ No se pudo asignar role: La clave de Supabase no tiene permisos de Admin (Service Role)")
        except Exception as metadata_error:
            print(f"[Register] ⚠️ Falló actualización de app_metadata: {metadata_error}")
        
        # Los estudiantes quedan matriculados en las clases activas disponibles.
        if request.role == 3:  # Estudiante
            try:
                all_classes = supabase.table("classes") \
                    .select("id") \
                    .eq("ctr_esatdo", 1) \
                    .eq("is_active", True) \
                    .execute()
                
                if all_classes.data:
                    enrollments = [
                        {"class_id": cls["id"], "student_id": user_id, "estado": 1}
                        for cls in all_classes.data
                    ]
                    supabase.table("class_enrollments").upsert(enrollments).execute()
                    print(f"[Register] ✅ Estudiante auto-matriculado en {len(enrollments)} clases")
            except Exception as enroll_error:
                print(f"[Register] ⚠️ Error en auto-matrícula: {enroll_error}")
        
        user = auth_response.user
        confirmed = user.email_confirmed_at is not None
        
        return RegisterResponse(
            message="Registro exitoso",
            detail="Se ha creado tu cuenta. Si el correo de confirmación está habilitado en Supabase, verifícalo.",
            user=UserResponse(
                user_id=str(user.id),
                email=user.email or request.email,
                full_name=request.full_name,
                role=request.role,
                confirmed=confirmed,
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_message = str(e)
        if "already registered" in error_message.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El usuario con este email ya está registrado"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar el usuario: {error_message}"
        )

