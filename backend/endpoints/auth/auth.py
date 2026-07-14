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
from utils.supabase_client import get_supabase_admin_client, get_supabase_client

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
    if request.role not in [2, 3]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El role de registro debe ser profesor (2) o estudiante (3)"
        )
    
    supabase: Client = get_supabase_client()
    admin_supabase = get_supabase_admin_client()
    
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
                    "full_name": request.full_name,
                    "requested_role": request.role
                }
            }
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al crear el usuario en Supabase Auth"
            )
        
        user_id = auth_response.user.id
        
        # Con credenciales administrativas se persiste el rol de inmediato.
        if admin_supabase:
            profile_data = {
                "user_id": user_id,
                "full_name": request.full_name,
                "email": request.email,
                "role": request.role,
                "is_active": True,
                "ctr_estado": 1
            }
            try:
                admin_supabase.auth.admin.update_user_by_id(
                    user_id,
                    {"app_metadata": {"role": request.role}}
                )
                admin_supabase.table("profiles").upsert(profile_data).execute()
                print(f"[Register] ✅ Perfil y role {request.role} sincronizados para {user_id}")
            except Exception as registration_error:
                try:
                    admin_supabase.auth.admin.delete_user(user_id)
                except Exception as cleanup_error:
                    print(f"[Register] ⚠️ No se pudo revertir el usuario {user_id}: {cleanup_error}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="No se pudo completar la configuración del usuario"
                ) from registration_error
        else:
            print("[Register] ℹ️ Rol delegado al trigger seguro de confirmación")
        
        # Los estudiantes quedan matriculados en las clases activas disponibles.
        if request.role == 3:  # Estudiante
            try:
                data_client = admin_supabase or supabase
                all_classes = data_client.table("classes") \
                    .select("id") \
                    .eq("ctr_esatdo", 1) \
                    .eq("is_active", True) \
                    .execute()
                
                if all_classes.data:
                    enrollments = [
                        {"class_id": cls["id"], "student_id": user_id, "estado": 1}
                        for cls in all_classes.data
                    ]
                    data_client.table("class_enrollments").upsert(enrollments).execute()
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

