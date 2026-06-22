from fastapi import APIRouter, Depends, HTTPException, Query
from core.config import settings
from core.deps import get_current_user
from supabase import create_client, Client
from pydantic import BaseModel
from typing import List, Optional

import pandas as pd
import io
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/users", tags=["Usuarios"])
supabase: Client = create_client(settings.supabase_url, settings.supabase_key)

@router.get("/export")
async def export_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    current_user: any = Depends(get_current_user)
):
    try:
        # 1. Base query (reuse filtering logic)
        query = supabase.table("profiles").select("*").neq("ctr_estado", 0)
        
        if role and role != "Todos":
            role_map = {"Admin": 1, "Profesor": 2, "Estudiante": 3}
            if role in role_map:
                query = query.eq("role", role_map[role])
        
        if status and status != "Todos":
            status_map = {"Activo": True, "Inactivo": False}
            if status in status_map:
                query = query.eq("is_active", status_map[status])
                
        if search:
            query = query.or_(f"full_name.ilike.%{search}%,email.ilike.%{search}%")

        res = query.order("created_at", desc=True).execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="No hay usuarios para exportar")

        # 2. Process data for Excel
        role_int_map = {1: "Admin", 2: "Profesor", 3: "Estudiante"}
        export_data = []
        
        for p in res.data:
            export_data.append({
                "Nombre Completo": p.get("full_name"),
                "Correo Electrónico": p.get("email"),
                "Rol": role_int_map.get(p.get("role"), "Desconocido"),
                "Estado": "Activo" if p.get("is_active") else "Inactivo",
                "Fecha de Creación": p.get("created_at", "").split("T")[0]
            })

        # 3. Create Excel in memory
        df = pd.DataFrame(export_data)
        output = io.BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Usuarios')
            
        output.seek(0)
        
        headers = {
            'Content-Disposition': 'attachment; filename="usuarios_plataforma.xlsx"'
        }
        
        return StreamingResponse(
            output,
            headers=headers,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

    except Exception as e:
        print(f"Error exporting users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class UserListResponse(BaseModel):
    id: str
    name: str # full_name
    email: str
    role: str # "Estudiante", "Profesor", "Admin"
    status: str # "Activo", "Inactivo"
    lastActivity: str # derived from updated_at or null
    # classes: Optional[List[str]] = [] # Expensive to join, maybe separate or simplified

class UserPageResponse(BaseModel):
    items: List[UserListResponse]
    total: int

@router.get("/", response_model=UserPageResponse)
async def get_users(
    skip: int = 0,
    limit: int = 10,
    search: Optional[str] = None,
    role: Optional[str] = None, # "Estudiante", "Profesor", "Admin", "Todos"
    status: Optional[str] = None, # "Activo", "Inactivo", "Todos"
    current_user: any = Depends(get_current_user)
):
    try:
        # Check admin role? For now assumed admin access or handled by frontend visibility.
        # Ideally enforce role=1 check here.
        
        # Base query
        # Exclude logically deleted users (ctr_estado = 0)
        query = supabase.table("profiles").select("*", count="exact").neq("ctr_estado", 0)
        
        # Filters
        if role and role != "Todos":
            role_map = {"Admin": 1, "Profesor": 2, "Estudiante": 3}
            if role in role_map:
                query = query.eq("role", role_map[role])
        
        if status and status != "Todos":
            status_map = {"Activo": True, "Inactivo": False}
            if status in status_map:
                query = query.eq("is_active", status_map[status])
                
        if search:
            # Search by name or email
            query = query.or_(f"full_name.ilike.%{search}%,email.ilike.%{search}%")
            
        # Pagination - count="exact" returns count in the response
        # Apply range and order for data retrieval
        query = query.range(skip, skip + limit - 1).order("created_at", desc=True)
        res = query.execute()
        
        users = []
        role_int_map = {1: "Admin", 2: "Profesor", 3: "Estudiante"}
        
        for p in res.data:
            r_str = role_int_map.get(p.get("role"), "Desconocido")
            # Status based on is_active (bool)
            is_active = p.get("is_active")
            s_str = "Activo" if is_active is True else "Inactivo"
            
            # Formatear last activity
            # Usamos updated_at o created_at o "Nunca"
            last_act = "Nunca"
            ts = p.get("updated_at")
            if ts:
                 # Simple parsing
                 last_act = ts.split("T")[0] # Just date for now or relative logic in frontend
            
            users.append({
                "id": p.get("user_id") or p.get("id"), # profiles usually user_id
                "name": p.get("full_name") or "Sin Nombre",
                "email": p.get("email") or "",
                "role": r_str,
                "status": s_str,
                "lastActivity":  last_act
            })
            
        return {
            "items": users,
            "total": res.count if res.count is not None else len(users)
        }

    except Exception as e:
        print(f"Error fetching users: {e}")
        return {"items": [], "total": 0}

@router.get("/{user_id}")
async def get_user_details(user_id: str, current_user: any = Depends(get_current_user)):
    try:
        # 1. Get Profile
        res = supabase.table("profiles").select("*").eq("user_id", user_id).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        profile = res.data
        role_id = profile.get("role")
        classes_list = []

        # 2. Get Classes based on role
        if role_id == 2: # Profesor
            # Clases creadas
            c_res = supabase.table("classes").select("name").eq("professor_id", user_id).eq("ctr_esatdo", 1).execute()
            classes_list = [c['name'] for c in c_res.data]
            
        elif role_id == 3: # Estudiante
            # Clases inscritas (Join class_enrollments -> classes)
            # Supabase join syntax: select("classes(name)")
            # Asumiendo relacion FK en class_enrollments (class_id -> classes.id)
            try:
                e_res = supabase.table("class_enrollments") \
                    .select("classes(name)") \
                    .eq("student_id", user_id) \
                    .execute()
                
                # e_res.data es tipo [{'classes': {'name': 'Matemáticas'}}, ...]
                for item in e_res.data:
                    c = item.get('classes')
                    if c and c.get('name'):
                        classes_list.append(c['name'])
            except Exception as e:
                print(f"Error fetching enrollments: {e}")

        # Formatter
        role_int_map = {1: "Admin", 2: "Profesor", 3: "Estudiante"}
        r_str = role_int_map.get(role_id, "Desconocido")
        s_str = "Activo" if profile.get("is_active") is True else "Inactivo" # Use is_active based on requested fix
        
        # Last activity
        last_act = "Nunca"
        if profile.get("updated_at"):
            last_act = profile.get("updated_at").split("T")[0]

        return {
            "id": profile.get("user_id"),
            "name": profile.get("full_name"),
            "email": profile.get("email"),
            "role": r_str,
            "status": s_str,
            "lastActivity": last_act,
            "createdAt": profile.get("created_at", "").split("T")[0],
            "classes": classes_list
        }

    except Exception as e:
        print(f"Error fetching user details: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None # "Estudiante", "Profesor", "Admin"
    status: Optional[str] = None # "Activo", "Inactivo"

class UserCreateRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str # "Estudiante", "Profesor", "Admin"

@router.post("/")
async def create_user(user: UserCreateRequest, current_user: any = Depends(get_current_user)):
    try:
        # 1. Map role string to int
        role_map = {"Admin": 1, "Profesor": 2, "Estudiante": 3}
        role_id = role_map.get(user.role, 3) # Default to Student if unknown

        # 2. Create user in Supabase Auth using Admin API
        # We use supabase.auth.admin because sign_up triggers email confirmation sometimes
        # and we want immediate creation with specific metadata.
        if not hasattr(supabase.auth, 'admin'):
             raise HTTPException(status_code=500, detail="Supabase Admin API not available")
             
        auth_res = supabase.auth.admin.create_user({
            "email": user.email,
            "password": user.password,
            "email_confirm": True, # Immediate confirmation
            "user_metadata": {"full_name": user.name},
            "app_metadata": {"role": role_id}
        })
        
        if not auth_res or not auth_res.user:
            raise HTTPException(status_code=400, detail="Error al crear usuario en Auth")

        user_id = auth_res.user.id

        # 3. Create/Update Profile in 'profiles' table
        # We use upsert because a Supabase trigger might have already created it.
        profile_data = {
            "user_id": user_id,
            "full_name": user.name,
            "email": user.email,
            "role": role_id,
            "is_active": True,
            "ctr_estado": 1 # Logical active state
        }
        
        profile_res = supabase.table("profiles").upsert(profile_data).execute()
        
        if not profile_res.data:
            # Cleanup auth user if profile fails? 
            # In a production app, maybe, but here we just log.
            print(f"Warning: Auth created but profile failed for {user_id}")
            raise HTTPException(status_code=500, detail="Usuario creado en Auth pero falló creación de perfil")

        return {"message": "Usuario creado correctamente", "user_id": user_id}

    except Exception as e:
        print(f"Error creating user: {e}")
        # Specific check for existing user
        if "already registered" in str(e).lower() or "Email already" in str(e):
             raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{user_id}")
async def update_user(user_id: str, user: UserUpdateRequest, current_user: any = Depends(get_current_user)):
    try:
        updates = {}
        if user.name:
            updates["full_name"] = user.name
        if user.email:
            updates["email"] = user.email
            # Note: Updating email in profiles does not update auth.users. 
            # Syncing is complex requiring service_role. 
            # For this MVP we just update profile.
            
        if user.role:
            role_map = {"Admin": 1, "Profesor": 2, "Estudiante": 3}
            if user.role in role_map:
                updates["role"] = role_map[user.role]
                
        if user.status:
            status_map = {"Activo": True, "Inactivo": False}
            if user.status in status_map:
                updates["is_active"] = status_map[user.status]
                # Removed ctr_estado sync per user request

        # updates["updated_at"] = "now()" # Column does not exist

        if not updates:
             raise HTTPException(status_code=400, detail="No fields to update")

        res = supabase.table("profiles").update(updates).eq("user_id", user_id).execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Usuario no encontrado o error al actualizar")

        return {"message": "Usuario actualizado correctamente"}

    except Exception as e:
        print(f"Error updating user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{user_id}")
async def delete_user(user_id: str, current_user: any = Depends(get_current_user)):
    try:
        # Logical Delete: ctr_estado=0, is_active=False
        updates = {
            "ctr_estado": 0,
            "is_active": False
        }
        
        # 1. Update Profile Logic
        res = supabase.table("profiles").update(updates).eq("user_id", user_id).execute()
        if not res.data:
             raise HTTPException(status_code=404, detail="Usuario no encontrado")

        # 2. Ban/Disable in Auth (optional strict enforcement)
        # Requires service_role key to be active in supabase client
        try:
             if hasattr(supabase.auth, 'admin') and hasattr(supabase.auth.admin, 'update_user_by_id'):
                  # Ban user for a very long time (approx 100 years)
                  supabase.auth.admin.update_user_by_id(user_id, {"ban_duration": "876000h"})
        except Exception as auth_e:
             print(f"Warning: Could not ban user in Auth system: {auth_e}")

        return {"message": "Usuario eliminado correctamente"}

    except Exception as e:
        print(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail=str(e))
