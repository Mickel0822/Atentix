"""
Endpoints para gestión de Clases.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from core.config import settings
from core.deps import get_current_user
from supabase import create_client, Client

router = APIRouter(prefix="/classes", tags=["Clases"])

# Cliente de Supabase
supabase: Client = create_client(settings.supabase_url, settings.supabase_key)

class JoinClassRequest(BaseModel):
    code: str


class ClassCreate(BaseModel):
    name: str
    description: Optional[str] = None
    code: Optional[str] = None
    schedule: Optional[str] = None


class ClassResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    code: Optional[str]
    professor_id: str
    schedule: Optional[str]
    is_active: Optional[bool]
    students_count: Optional[int] = 0
    videos_count: Optional[int] = 0
    professor_name: Optional[str] = "Profesor Asignado"
    has_pending_videos: Optional[bool] = False


@router.get("/", response_model=List[ClassResponse])
async def get_classes(current_user: any = Depends(get_current_user)):
    """
    Obtiene las clases del usuario actual con conteos y estado.
    """
    try:
        user_id = current_user.id
        role_raw = current_user.app_metadata.get("role", 3)
        try:
            role = int(role_raw)
        except:
            role = 3

        classes_data = []

        if role == 1: # Admin
            response = supabase.table("classes").select("*").eq("ctr_esatdo", 1).execute()
            classes_data = response.data
        
        elif role == 2: # Profesor
            response = supabase.table("classes").select("*").eq("professor_id", user_id).eq("ctr_esatdo", 1).execute()
            classes_data = response.data
            
        else: # Estudiante
            enrollments = supabase.table("class_enrollments").select("class_id").eq("student_id", user_id).eq("estado", 1).execute()
            class_ids = [e['class_id'] for e in enrollments.data]
            if class_ids:
                # Estudiantes solo ven clases activas y no eliminadas
                response = supabase.table("classes") \
                    .select("*") \
                    .in_("id", class_ids) \
                    .eq("ctr_esatdo", 1) \
                    .eq("is_active", True) \
                    .execute()
                classes_data = response.data

        # Enriquecer con conteos y datos extra
        result = []
        for cls in classes_data:
            # 1. Obtener nombre del profesor
            prof_name = "Profesor Asignado"
            if cls.get('professor_id'):
                try:
                    prof_res = supabase.table("profiles").select("full_name").eq("user_id", cls['professor_id']).single().execute()
                    if prof_res.data and prof_res.data.get('full_name'):
                        prof_name = prof_res.data['full_name']
                except:
                    pass
            cls['professor_name'] = prof_name

            # 2. Contar estudiantes
            students_res = supabase.table("class_enrollments").select("student_id", count="exact").eq("class_id", cls['id']).execute()
            students_count = students_res.count if students_res.count is not None else len(students_res.data)
            cls['students_count'] = students_count
            
            # 3. Contar videos y calcular pendientes
            # Traemos los IDs para poder chequear cuales estan vistos (FILTRANDO ELIMINADOS)
            videos_res = supabase.table("tasks").select("id").eq("class_id", cls['id']).eq("ctr_estado", 1).eq("is_active", True).execute()
            tasks_data = videos_res.data or []
            videos_count = len(tasks_data)
            cls['videos_count'] = videos_count

            has_pending = False
            # Si es estudiante, calculamos progreso
            if role == 3 and videos_count > 0:
                task_ids = [t['id'] for t in tasks_data]
                # Contar cuantas de estas tasks tienen session completed por este usuario
                sessions_res = supabase.table("activity_sessions") \
                    .select("task_id", count="exact") \
                    .eq("student_id", user_id) \
                    .eq("status", "completed") \
                    .in_("task_id", task_ids) \
                    .execute()
                
                completed_count = sessions_res.count if sessions_res.count is not None else len(sessions_res.data)
                if completed_count < videos_count:
                    has_pending = True
            
            # Si es profesor, la logica de pending podria ser diferente o siempre false
            cls['has_pending_videos'] = has_pending

            result.append(cls)

        return result


    except Exception as e:
        print(f"Error getting classes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/join")
async def join_class_by_code(request: JoinClassRequest, current_user: any = Depends(get_current_user)):
    """
    Permite a un estudiante unirse a una clase usando su código.
    """
    try:
        # 1. Buscar la clase por código
        # Nota: Asumimos que la columna se llama 'code' en la tabla 'classes'
        class_res = supabase.table("classes").select("id").eq("code", request.code).execute()
        
        if not class_res.data:
             raise HTTPException(status_code=404, detail="Código de clase inválido")
             
        class_id = class_res.data[0]['id']
        student_id = current_user.id
        
        # 2. Verificar si ya está inscrito
        check = supabase.table("class_enrollments").select("*").eq("class_id", class_id).eq("student_id", student_id).execute()
        if check.data:
             existing = check.data[0]
             # Si ya estÃ¡ activo (estado=1), error. Si esta borrado (0 o null), reactivar.
             if existing.get('estado') == 1:
                 raise HTTPException(status_code=400, detail="Ya estás inscrito en esta clase")
             else:
                 # Reactivar
                 supabase.table("class_enrollments").update({"estado": 1}).eq("class_id", class_id).eq("student_id", student_id).execute()
                 return {"message": "Inscripción reactivada exitosamente", "class_id": class_id}

        # 3. Inscribir (Nuevo registro)
        data = {"class_id": class_id, "student_id": student_id, "estado": 1}
        response = supabase.table("class_enrollments").insert(data).execute()
        
        return {"message": "Inscripción exitosa", "class_id": class_id}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error joining class: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=ClassResponse)
async def create_class(class_data: ClassCreate, professor_id: str, current_user: any = Depends(get_current_user)):
    """
    US-05: Crear y gestionar clases - Crea una nueva clase asignada al profesor autenticado.
    """
    try:
        # US-05: Validar que el creador de la clase sea el profesor autenticado
        if current_user:
            final_professor_id = current_user.id
        else:
            # Fallback legacy (probablemente ya no se use si el endpoint está protegido)
            final_professor_id = professor_id
            
            if professor_id == "profesor-demo-id":
                 # Buscar perfil con rol profesor (2)
                 prof_check = supabase.table("profiles").select("user_id").eq("role", 2).limit(1).execute()
                 if prof_check.data:
                     final_professor_id = prof_check.data[0]['user_id']
                 else:
                     # Si no hay profesor, buscar cualquier usuario
                     any_user = supabase.table("profiles").select("user_id").limit(1).execute()
                     if any_user.data:
                         final_professor_id = any_user.data[0]['user_id']
                     else:
                         raise HTTPException(status_code=400, detail="No se encontraron usuarios para asignar.")

        # US-05: Insertar la nueva clase con su código de acceso, nombre, horario y descripción
        data = {
            "name": class_data.name,
            "description": class_data.description,
            "code": class_data.code,
            "schedule": class_data.schedule,
            "professor_id": final_professor_id,
            "ctr_esatdo": 1,
            "is_active": True
        }
        response = supabase.table("classes").insert(data).execute()
        return response.data[0]
    except Exception as e:
        # Mejor manejo de error para FK
        msg = str(e)
        if "foreign key constraint" in msg.lower():
            raise HTTPException(status_code=400, detail=f"Error de Integridad: El ID de profesor '{final_professor_id}' no existe en la tabla profiles. Asegúrate de que el usuario existe.")
        raise HTTPException(status_code=500, detail=msg)


@router.get("/{class_id}", response_model=ClassResponse)
async def get_class(class_id: str, current_user: any = Depends(get_current_user)):
    """
    Obtiene los detalles de una clase específica.
    """
    try:
        response = supabase.table("classes").select("*").eq("id", class_id).single().execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ClassUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    code: Optional[str] = None
    schedule: Optional[str] = None
    is_active: Optional[bool] = None


@router.put("/{class_id}", response_model=ClassResponse)
async def update_class(class_id: str, class_update: ClassUpdate, current_user: any = Depends(get_current_user)):
    """
    US-05: Crear y gestionar clases - Actualiza la información de una clase existente (nombre, descripción, código, horario).
    """
    try:
        # US-05: Filtrar únicamente los campos no nulos enviados por el usuario
        update_data = {k: v for k, v in class_update.dict().items() if v is not None}
        
        if not update_data:
             raise HTTPException(status_code=400, detail="No se enviaron datos para actualizar")

        # US-05: Actualizar la clase en la base de datos Supabase
        response = supabase.table("classes").update(update_data).eq("id", class_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Clase no encontrada o error al actualizar")
            
        return response.data[0]
    except Exception as e:
        print(f"Error updating class: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{class_id}/students")
async def get_class_students(class_id: str, current_user: any = Depends(get_current_user)):
    """
    Obtiene los estudiantes inscritos en una clase.
    """
    try:
        response = supabase.table("class_enrollments") \
            .select("student_id, profiles(full_name, email)") \
            .eq("class_id", class_id) \
            .eq("estado", 1) \
            .execute()
        return response.data
    except Exception as e:
        print(f"Error getting students: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{class_id}/enroll")
async def enroll_student(class_id: str, student_id: str, current_user: any = Depends(get_current_user)):
    """
    Inscribe a un estudiante en una clase.
    """
    try:
        data = {"class_id": class_id, "student_id": student_id, "estado": 1}
        # Usamos upsert para reactivar si ya existía como eliminado (0)
        response = supabase.table("class_enrollments").upsert(data).execute()
        return {"message": "Estudiante inscrito exitosamente", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{class_id}/students/{student_id}")
async def remove_student(class_id: str, student_id: str, current_user: any = Depends(get_current_user)):
    """
    Elimina a un estudiante de una clase (Físicamente).
    """
    try:
        # Soft delete: Cambiar estado a 0
        response = supabase.table("class_enrollments").update({"estado": 0}).eq("class_id", class_id).eq("student_id", student_id).execute()
        
        return {"message": "Estudiante eliminado exitosamente"}
    except Exception as e:
        print(f"Error removing student: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{class_id}")
async def delete_class(class_id: str, current_user: any = Depends(get_current_user)):
    """
    US-05: Crear y gestionar clases - Elimina una clase de forma lógica (Soft Delete) y deshabilita sus videos/tareas asociados.
    """
    try:
        # US-05: Ejecutar eliminación lógica cambiando ctr_esatdo a 0
        data = {"ctr_esatdo": 0}
        response = supabase.table("classes").update(data).eq("id", class_id).execute()
        
        if not response.data:
             raise HTTPException(status_code=404, detail="Clase no encontrada o error al eliminar")

        # US-05: Eliminación lógica en cascada para deshabilitar las tareas/videos de la clase eliminada
        supabase.table("tasks").update({"ctr_estado": 0}).eq("class_id", class_id).execute()

        return {"message": "Clase eliminada exitosamente (Soft Delete)"}

    except Exception as e:
        print(f"Error deleting class: {e}")
        raise HTTPException(status_code=500, detail=str(e))
