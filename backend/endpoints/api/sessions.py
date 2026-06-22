"""
Endpoints para gestión de Sesiones de Actividad (Monitoreo de Atención).
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from core.config import settings
from core.deps import get_current_user, get_current_user_token
from services.ai_service import ai_service
from supabase import create_client, Client
from datetime import datetime

router = APIRouter(prefix="/sessions", tags=["Sesiones de Estudio"])

supabase: Client = create_client(settings.supabase_url, settings.supabase_key)


class SessionStart(BaseModel):
    task_id: str
    student_id: str


class SessionEnd(BaseModel):
    session_id: str
    attention_level: str  # 'alto', 'medio', 'bajo'


class QuizAnswer(BaseModel):
    quiz_id: str
    answers: dict  # {"q0": "opcion_elegida", "q1": "otra_opcion", ...}


@router.post("/start")
async def start_session(data: SessionStart, current_user: any = Depends(get_current_user)):
    """
    Inicia una sesión de estudio cuando el estudiante empieza a ver un video.
    """
    try:
        # attention_level se establecerá cuando se finalice la sesión
        # No lo incluimos al iniciar porque aún no se ha calculado
        session_data = {
            "task_id": data.task_id,
            "student_id": current_user.id, # Aseguramos que sea el usuario autenticado
            "status": "started"
        }
        response = supabase.table("activity_sessions").insert(session_data).execute()
        return {"message": "Sesión iniciada", "session": response.data[0]}
    except Exception as e:
        print(f"[Session Start] ❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/end")
async def end_session(data: SessionEnd):
    """
    Finaliza una sesión de estudio.
    1. Actualiza el registro de sesión con el puntaje de atención.
    2. Obtiene el resumen/transcripción del video asociado.
    3. Genera un cuestionario personalizado con IA.
    4. Guarda el cuestionario.
    5. Retorna el cuestionario al frontend.
    """
    try:
        # Validar que attention_level sea válido
        if data.attention_level not in ['alto', 'medio', 'bajo']:
            raise HTTPException(
                status_code=400, 
                detail="attention_level debe ser 'alto', 'medio' o 'bajo'"
            )
        
        print(f"[Session End] 🎬 Finalizando sesión: {data.session_id}")
        print(f"[Session End] 📊 Nivel de atención: {data.attention_level}")
        
        # 1. Actualizar sesión
        update_data = {
            "attention_level": data.attention_level,
            "status": "completed",
            "completed_at": datetime.utcnow().isoformat()
        }
        supabase.table("activity_sessions") \
            .update(update_data) \
            .eq("id", data.session_id) \
            .execute()
        print(f"[Session End] ✅ Sesión actualizada")
        
        # 2. Obtener información de la tarea/video
        session_info = supabase.table("activity_sessions") \
            .select("task_id") \
            .eq("id", data.session_id) \
            .single() \
            .execute()
        print(f"[Session End] 📋 Task ID: {session_info.data['task_id']}")
        
        task_info = supabase.table("tasks") \
            .select("transcription, title, description, questions_count") \
            .eq("id", session_info.data["task_id"]) \
            .single() \
            .execute()
        print(f"[Session End] 📝 Task info - Title: {task_info.data.get('title')}")
        print(f"[Session End] 📝 Transcription: {(task_info.data.get('transcription') or 'No disponible')[:100]}...")
        
        # 3. Generar cuestionario con IA
        content_for_quiz = task_info.data.get("transcription") or \
                          f"{task_info.data.get('title', '')} {task_info.data.get('description', '')}"
        
        print(f"[Session End] 📄 Contenido para quiz ({len(content_for_quiz)} chars): {content_for_quiz[:200]}...")
        
        # Default a 5 si no hay dato
        q_count = task_info.data.get("questions_count") or 5
        print(f"[Session End] 🔢 Número de preguntas: {q_count}")

        # Convertir attention_level a score numérico para el quiz
        # (generate_quiz necesita un float)
        attention_score_map = {
            'alto': 0.8,
            'medio': 0.5,
            'bajo': 0.3
        }
        attention_score = attention_score_map.get(data.attention_level, 0.5)

        quiz_questions = await ai_service.generate_quiz(
            text=content_for_quiz,
            attention_score=attention_score,
            num_questions=q_count
        )
        print(f"[Session End] ✅ Quiz generado: {len(quiz_questions)} preguntas")
        
        # 4. Guardar cuestionario en BD
        quiz_data = {
            "session_id": data.session_id,
            "content": quiz_questions
        }
        quiz_response = supabase.table("generated_quizzes").insert(quiz_data).execute()
        print(f"[Session End] ✅ Quiz guardado con ID: {quiz_response.data[0]['id']}")
        
        # 5. Retornar cuestionario
        return {
            "message": "Sesión completada. Cuestionario generado.",
            "quiz_id": quiz_response.data[0]["id"],
            "questions": quiz_questions
        }
    except Exception as e:
        print(f"[Session End] ❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/quiz/{quiz_id}")
async def get_quiz(quiz_id: str):
    """
    Obtiene el contenido de un cuestionario generado.
    Incluye respuestas del estudiante, puntuación y datos de la sesión (atención, tiempos).
    """
    try:
        print(f"Fetching quiz with ID: {quiz_id}")
        response = supabase.table("generated_quizzes") \
            .select("*, activity_sessions(attention_level, started_at, completed_at, tasks(title, description, class_id))") \
            .eq("id", quiz_id) \
            .single() \
            .execute()
        return response.data
    except Exception as e:
        print(f"Error fetching quiz {quiz_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quiz/submit")
async def submit_quiz(data: QuizAnswer):
    """
    Recibe las respuestas del estudiante, calcula el puntaje y lo guarda.
    """
    try:
        # Obtener el quiz para calcular la nota
        quiz_info = supabase.table("generated_quizzes") \
            .select("content") \
            .eq("id", data.quiz_id) \
            .single() \
            .execute()
        
        questions = quiz_info.data["content"]
        correct_count = 0
        total = len(questions)
        
        for i, q in enumerate(questions):
            user_answer = data.answers.get(f"q{i}", "")
            if user_answer == q.get("correct_answer"):
                correct_count += 1
        
        # Calcular puntuación sobre 20
        score = (correct_count / total) * 20 if total > 0 else 0
        
        # Actualizar quiz con respuestas y nota
        update_data = {
            "student_answers": data.answers,
            "score_obtained": score,
            "completed_at": datetime.utcnow().isoformat()
        }
        supabase.table("generated_quizzes") \
            .update(update_data) \
            .eq("id", data.quiz_id) \
            .execute()
        
        return {
            "message": "Cuestionario enviado",
            "score": score,
            "correct": correct_count,
            "total": total
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/student/class/{class_id}")
async def get_student_class_results(
    class_id: str, 
    current_user: any = Depends(get_current_user),
    token: str = Depends(get_current_user_token)
):
    """
    Obtiene los resultados de evaluaciones de un estudiante para una clase específica.
    Devuelve TODOS los videos de la clase, con su estado de evaluación correspondiente si existe.
    """
    try:
        # Crear cliente con contexto de usuario para respetar RLS
        # Instanciamos uno nuevo para no afectar al global
        auth_client = create_client(settings.supabase_url, settings.supabase_key)
        auth_client.postgrest.auth(token)

        # 1. Obtener todas las tareas (videos) de la clase
        # Usamos cliente global (con permisos de lectura generales o service role) para asegurar que las tareas se listen
        tasks_res = supabase.table("tasks") \
            .select("id, title, duration_seconds") \
            .eq("class_id", class_id) \
            .eq("ctr_estado", 1) \
            .eq("is_active", True) \
            .execute()
        tasks = tasks_res.data or []

        if not tasks:
            return []

        # 2. Obtener sesiones iniciadas por el alumno en estas tareas
        task_ids = [t['id'] for t in tasks]
        
        # Consultamos sessions usando auth_client para respetar RLS (solo mis sesiones)
        # Nota: quitamos generated_quizzes del select para evitar bloqueo por RLS en el join
        sessions_res = auth_client.table("activity_sessions") \
            .select("id, task_id, status, started_at") \
            .eq("student_id", current_user.id) \
            .in_("task_id", task_ids) \
            .order("started_at", desc=True) \
            .execute()
            
        sessions_data = sessions_res.data or []
        
        # 3. Enriquecer con Quizzes usando cliente global (bypass RLS de quizzes si es necesario)
        session_ids = [s['id'] for s in sessions_data]
        
        quizzes_map = {}
        
        if session_ids:
            quizzes_res = supabase.table("generated_quizzes") \
                .select("id, session_id, score_obtained, completed_at, created_at") \
                .in_("session_id", session_ids) \
                .execute()
            
            quizzes_data = quizzes_res.data or []

            for q in quizzes_data:
                # Guardamos lista de quizzes por session_id (aunque suele ser 1 a 1 o 1 a muchos)
                if q['session_id'] not in quizzes_map:
                    quizzes_map[q['session_id']] = []
                quizzes_map[q['session_id']].append(q)

        # Agrupar sesiones por task_id y adjuntar quizzes
        sessions_by_task = {}
        for s in sessions_data:
            qz_list = quizzes_map.get(s['id'], [])
            s['generated_quizzes'] = qz_list
            
            tid = s['task_id']
            if tid not in sessions_by_task:
                sessions_by_task[tid] = []
            sessions_by_task[tid].append(s)

        # 4. Construir respuesta combinada
        results = []
        for task in tasks:
            task_sessions = sessions_by_task.get(task['id'], [])
            
            # Buscar la sesión "mejor" o más relevante
            selected_session = None
            
            for s in task_sessions:
                if s.get('generated_quizzes') and len(s['generated_quizzes']) > 0:
                    selected_session = s
                    break
            
            if not selected_session and task_sessions:
                selected_session = task_sessions[0]

            result_item = {
                "id": selected_session['id'] if selected_session else f"temp-{task['id']}", 
                "task_id": task['id'],
                "tasks": {
                    "title": task['title'],
                    "duration_seconds": task.get('duration_seconds', 0)
                }, 
                "status": selected_session['status'] if selected_session else "pending",
                "generated_quizzes": selected_session['generated_quizzes'] if selected_session else []
            }
            results.append(result_item)
            
        return results

    except Exception as e:
        print(f"Error getting student class results: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/student/{student_id}/history")
async def get_student_history(student_id: str):
    """
    Obtiene el historial de sesiones de un estudiante.
    Útil para el dashboard del estudiante.
    """
    try:
        # 1. Obtener clases activas del estudiante (estado=1)
        enrollments = supabase.table("class_enrollments").select("class_id").eq("student_id", student_id).eq("estado", 1).execute()
        valid_class_ids = [e['class_id'] for e in enrollments.data]
        
        if not valid_class_ids:
            return []

        # 2. Obtener historial filtrando por esas clases
        response = supabase.table("activity_sessions") \
            .select("*, tasks!inner(title, video_url, class_id, classes!inner(name, ctr_esatdo, is_active)), generated_quizzes(quiz_id:id, score_obtained)") \
            .eq("student_id", student_id) \
            .in_("tasks.class_id", valid_class_ids) \
            .eq("tasks.classes.ctr_esatdo", 1) \
            .eq("tasks.classes.is_active", True) \
            .order("started_at", desc=True) \
            .limit(5) \
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
