"""
Endpoints para gestión de Tareas (Videos).
Incluye subida de video y procesamiento con IA.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from pydantic import BaseModel
from typing import List, Optional
from core.config import settings
from core.deps import get_current_user
from services.video_service import video_service
from services.transcription_service import transcription_service
from supabase import create_client, Client
import uuid
import re
import os
import asyncio

router = APIRouter(prefix="/tasks", tags=["Tareas/Videos"])

# Asegurar que la URL de Supabase tenga trailing slash
supabase_url = settings.supabase_url.rstrip('/') + '/'
supabase: Client = create_client(supabase_url, settings.supabase_key)


def sanitize_filename(filename: str) -> str:
    """
    Sanitiza el nombre del archivo para que sea válido como clave de Supabase Storage.
    Elimina o reemplaza caracteres especiales que pueden causar errores InvalidKey.
    """
    if not filename:
        return "video.mp4"
    
    # Obtener el nombre base y la extensión
    name, ext = os.path.splitext(filename)
    
    # Reemplazar caracteres especiales y espacios
    # Mantener solo letras, números, guiones, guiones bajos y puntos
    sanitized_name = re.sub(r'[^a-zA-Z0-9._-]', '_', name)
    
    # Eliminar múltiples guiones bajos consecutivos
    sanitized_name = re.sub(r'_+', '_', sanitized_name)
    
    # Eliminar guiones bajos al inicio y final
    sanitized_name = sanitized_name.strip('_')
    
    # Si el nombre quedó vacío, usar un nombre por defecto
    if not sanitized_name:
        sanitized_name = "video"
    
    # Limitar la longitud del nombre (máximo 200 caracteres)
    if len(sanitized_name) > 200:
        sanitized_name = sanitized_name[:200]
    
    return f"{sanitized_name}{ext}"


class TaskCreate(BaseModel):
    class_id: str
    title: str
    description: Optional[str] = None


class TaskResponse(BaseModel):
    id: str
    class_id: str
    class_name: Optional[str] = None
    title: str
    description: Optional[str]
    video_url: str
    transcription: Optional[str]
    inicio_habilitado: Optional[str] = None
    fin_habilitado: Optional[str] = None
    is_active: Optional[bool] = None
    duration_seconds: Optional[int] = None
    questions_count: Optional[int] = 0
    created_at: Optional[str] = None


class StudentTaskResponse(TaskResponse):
    watched: bool = False


@router.get("/student/class/{class_id}", response_model=List[StudentTaskResponse])
async def get_tasks_by_class_student(class_id: str, current_user: any = Depends(get_current_user)):
    """
    Obtiene tareas de una clase para un estudiante, incluyendo estado 'watched'.
    """
    try:
        # 1. Obtener todas las tareas de la clase (Activas)
        tasks_res = supabase.table("tasks").select("*").eq("class_id", class_id).eq("ctr_estado", 1).eq("is_active", True).execute()
        tasks = tasks_res.data
        
        if not tasks:
            return []

        # 2. Obtener sesiones completadas por el estudiante para estas tareas
        task_ids = [t['id'] for t in tasks]
        # In_ filter para traer sesiones de todas las tareas a la vez
        sessions_res = supabase.table("activity_sessions") \
            .select("task_id, status") \
            .eq("student_id", current_user.id) \
            .in_("task_id", task_ids) \
            .execute()
        
        # Crear set de videos vistos (completed)
        watched_task_ids = {
            s['task_id'] for s in sessions_res.data 
            if s.get('status') == 'completed'
        }

        # 3. Mapear respuesta
        result = []
        for task in tasks:
            task['watched'] = task['id'] in watched_task_ids
            result.append(task)
            
        return result

    except Exception as e:
        print(f"Error getting student tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/class/{class_id}", response_model=List[TaskResponse])
async def get_tasks_by_class(class_id: str):
    """
    Obtiene todas las tareas/videos de una clase específica.
    """
    try:
        response = supabase.table("tasks") \
            .select("*") \
            .eq("class_id", class_id) \
            .eq("ctr_estado", 1) \
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/professor/me", response_model=List[TaskResponse])
async def get_professor_tasks(current_user: any = Depends(get_current_user)):
    """
    Obtiene todas las tareas (videos) de las clases creadas por el profesor actual.
    """
    try:
        user_id = current_user.id
        
        # 1. Obtener todas las clases del profesor
        classes_res = supabase.table("classes").select("id, name").eq("professor_id", user_id).eq("ctr_esatdo", 1).execute()
        classes = classes_res.data
        
        if not classes:
            return []
            
        class_map = {c['id']: c['name'] for c in classes}
        class_ids = list(class_map.keys())
        
        # 2. Obtener tareas de esas clases (Solo activas)
        tasks_res = supabase.table("tasks").select("*").in_("class_id", class_ids).eq("ctr_estado", 1).execute()
        tasks = tasks_res.data
        
        # 3. Enriquecer con nombre de clase
        for task in tasks:
            task['class_name'] = class_map.get(task['class_id'], "Desconocida")
            
        return tasks
    except Exception as e:
        print(f"Error getting professor tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{task_id}")
async def get_task(task_id: str):
    """
    Obtiene los detalles de una tarea específica, incluyendo el resumen de IA.
    """
    try:
        # En este caso también sería ideal traer el nombre de la clase si se necesita en detalle
        response = supabase.table("tasks") \
            .select("*") \
            .eq("id", task_id) \
            .single() \
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_task_video(
    class_id: str = Form(...),
    title: str = Form(...),
    description: str = Form(None),
    questions_count: int = Form(5),
    inicio_habilitado: Optional[str] = Form(None),  # ISO format datetime string
    fin_habilitado: Optional[str] = Form(None),    # ISO format datetime string
    duration_seconds: Optional[int] = Form(None),
    is_active: Optional[str] = Form("true"),  # String "true" o "false"
    video: UploadFile = File(...)
):
    """
    Sube un video para una nueva tarea.
    1. Guarda el video localmente (temporalmente).
    2. Sube al Storage de Supabase.
    3. Transcribe el video con Whisper y genera el resumen.
    4. Crea el registro en la tabla 'tasks' con el resumen.
    """
    try:
        # 1. Guardar localmente
        local_path = await video_service.save_upload_locally(video)
        
        # 2. Subir a Supabase Storage
        # Sanitizar el nombre del archivo para evitar caracteres especiales
        sanitized_filename = sanitize_filename(video.filename)
        file_name = f"{uuid.uuid4()}_{sanitized_filename}"
        with open(local_path, "rb") as f:
            storage_response = supabase.storage.from_("videos").upload(
                file_name, 
                f,
                {"content-type": video.content_type}
            )
        
        # Obtener URL pública
        video_url = supabase.storage.from_("videos").get_public_url(file_name)
        
        # 3. Transcribir video con Whisper y generar resumen
        print(f"[upload_task_video] Iniciando transcripción del video...")
        transcribe_task_id = transcription_service.start_transcription(local_path)
        
        # Polling para esperar la transcripción (máximo 10 minutos)
        summary = "Resumen no disponible (tiempo de espera agotado)."
        attempts = 0
        max_attempts = 300  # 300 intentos * 2 segundos = 10 minutos
        
        while attempts < max_attempts:
            await asyncio.sleep(2)  # Esperar 2 segundos entre intentos
            attempts += 1
            
            status_data = transcription_service.get_task_status(transcribe_task_id)
            
            if status_data is None:
                # Tarea aún no registrada, continuar esperando
                continue
            
            if status_data.get("status") == "completed":
                summary = status_data.get("text") or "Transcripción vacía."
                print(f"[upload_task_video] Transcripción completada ({attempts * 2}s)")
                break
            elif status_data.get("status") == "failed":
                error_msg = status_data.get("error", "Error en transcripción.")
                summary = f"Resumen no disponible. {error_msg}"
                print(f"[upload_task_video] Error en transcripción: {error_msg}")
                break
        
        if attempts >= max_attempts:
            print(f"[upload_task_video] Timeout esperando transcripción después de {max_attempts * 2}s")
        
        # 4. Crear registro en BD
        task_data = {
            "class_id": class_id,
            "title": title,
            "description": description,
            "video_url": video_url,
            "transcription": summary,  # Guardamos la transcripción en lugar del resumen
            "questions_count": questions_count,
            "ctr_estado": 1 # Por defecto activo/visible (Soft Delete)
        }
        
        # Agregar fechas de disponibilidad si se proporcionaron
        if inicio_habilitado:
            task_data["inicio_habilitado"] = inicio_habilitado
        if fin_habilitado:
            task_data["fin_habilitado"] = fin_habilitado
        
        # Agregar duración del video si se proporcionó, o intentar obtenerla del archivo
        final_duration = duration_seconds
        if final_duration is None:
            # Intentar obtener la duración del archivo local usando moviepy como fallback
            try:
                from moviepy.editor import VideoFileClip
                with VideoFileClip(local_path) as clip:
                    final_duration = int(clip.duration)
                print(f"[upload_task_video] Duración obtenida del archivo: {final_duration}s")
            except Exception as e:
                print(f"[upload_task_video] No se pudo obtener duración del video: {e}")
                final_duration = None
        
        if final_duration is not None:
            task_data["duration_seconds"] = final_duration
        
        # Agregar is_active (convertir string a boolean)
        # Default a True si no se especifica o si hay dudas
        is_active_bool = True
        if is_active is not None:
            is_active_bool = str(is_active).lower() == "true"
        
        task_data["is_active"] = is_active_bool
        print(f"[upload_task_video] is_active final value: {task_data['is_active']} (input: {is_active})")
        
        try:
            db_response = supabase.table("tasks").insert(task_data).execute()
        except Exception as e:
            # Si falla, es posible que la columna questions_count no exista aun en la BD.
            # Intentamos insertar sin ella (fallback)
            if "questions_count" in str(e) or "column" in str(e):
                del task_data["questions_count"]
                db_response = supabase.table("tasks").insert(task_data).execute()
            else:
                raise e # Si es otro error, re-lanzarlo
        
        # Limpieza
        video_service.cleanup(local_path)
        
        return {
            "message": "Video subido exitosamente",
            "task": db_response.data[0]
        }
    except Exception as e:
        # Log del error en consola del backend para debugging
        print(f"Error uploading task: {e}")
        raise HTTPException(status_code=500, detail=f"Error al subir video: {str(e)}")


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    class_id: Optional[str] = None
    inicio_habilitado: Optional[str] = None
    fin_habilitado: Optional[str] = None
    is_active: Optional[bool] = None


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, task_update: TaskUpdate, current_user: any = Depends(get_current_user)):
    """
    Actualiza una tarea (video) existente.
    """
    try:
        print(f"[update_task] Updating task {task_id} with: {task_update.dict()}")
        
        # Filtrar campos nulos y convertir class_id vacío a None si es necesario o manejarlo
        update_data = {k: v for k, v in task_update.dict().items() if v is not None}
        
        if not update_data:
             raise HTTPException(status_code=400, detail="No se enviaron datos para actualizar")

        print(f"[update_task] Payload to DB: {update_data}")

        response = supabase.table("tasks").update(update_data).eq("id", task_id).execute()
        
        if not response.data:
            # Si no devuelve datos, puede que el ID no exista
            print(f"[update_task] No data returned. ID {task_id} might not exist.")
            raise HTTPException(status_code=404, detail="Video no encontrado o error al actualizar")
            
        return response.data[0]
    except Exception as e:
        print(f"Error updating task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{task_id}")
async def delete_task_soft(task_id: str, current_user: any = Depends(get_current_user)):
    """
    Eliminación lógica del video (Soft Delete).
    Cambia ctr_estado a 0.
    """
    try:
        print(f"[delete_task] Soft deleting task {task_id}")
        
        # Actualizar ctr_estado a 0
        response = supabase.table("tasks").update({"ctr_estado": 0}).eq("id", task_id).execute()
        
        if not response.data:
            print(f"[delete_task] Task {task_id} not found or already deleted.")
            raise HTTPException(status_code=404, detail="Video no encontrado")
            
        return {"message": "Video eliminado correctamente"}
    except Exception as e:
        print(f"Error deleting task: {e}")
        raise HTTPException(status_code=500, detail=str(e))
