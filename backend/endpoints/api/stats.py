from fastapi import APIRouter, HTTPException, Depends
from core.config import settings
from core.deps import get_current_user
from supabase import create_client, Client
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

router = APIRouter(prefix="/stats", tags=["Estadísticas"])
supabase: Client = create_client(settings.supabase_url, settings.supabase_key)

class VideoStudentResult(BaseModel):
    studentId: str
    studentName: str
    studentEmail: str
    videoId: str
    score: float
    correctAnswers: int
    incorrectAnswers: int
    totalQuestions: int
    attentionLevel: str

@router.get("/tasks/{task_id}/results", response_model=List[VideoStudentResult])
async def get_task_results(task_id: str, current_user: any = Depends(get_current_user)):
    """
    Obtiene los resultados de todos los estudiantes para un video/tarea específica.
    """
    try:
        # 1. Obtener sesiones completadas para esta tarea
        sessions_res = supabase.table("activity_sessions") \
            .select("student_id, attention_level, generated_quizzes(score_obtained)") \
            .eq("task_id", task_id) \
            .eq("status", "completed") \
            .execute()
            
        sessions = sessions_res.data
        if not sessions:
            return []
            
        student_ids = [s['student_id'] for s in sessions]
        
        # 2. Obtener Info Estudiantes (Profiles)
        students_map = {}
        if student_ids:
            try:
                profiles_res = supabase.table("profiles").select("user_id, full_name, email").in_("user_id", student_ids).execute()
                for p in profiles_res.data:
                    students_map[p['user_id']] = p
            except Exception as e:
                print(f"Error fetching profiles: {e}")

        results = []
        for s in sessions:
            student_info = students_map.get(s['student_id'], {})
            
            quizzes = s.get('generated_quizzes', [])
            score = 0
            correct = 0
            incorrect = 0
            total = 5 # Default questions count
            
            if quizzes and len(quizzes) > 0:
                q = quizzes[0]
                score = float(q.get('score_obtained') or 0)
                # Estimacion simple ya que no tenemos detalle de preguntas en este nivel aun
                if score >= 0:
                     correct = int((score / 20) * total) 
                incorrect = total - correct

            results.append(VideoStudentResult(
                studentId=s['student_id'],
                studentName=student_info.get("full_name", "Estudiante"),
                studentEmail=student_info.get("email", "N/A"),
                videoId=task_id,
                score=score,
                correctAnswers=correct,
                incorrectAnswers=incorrect,
                totalQuestions=total,
                attentionLevel=s.get('attention_level', 'medio')
            ))
            
        return results

    except Exception as e:
        print(f"Error getting task results: {e}")
        # En caso de error devolvemos lista vacia
        return []

@router.get("/professor-dashboard")
async def get_professor_stats(current_user: any = Depends(get_current_user)):
    """
    Retorna estadisticas para el dashboard del profesor:
    - active_classes: Cantidad de clases del profesor.
    - total_students: Suma de inscripciones en sus clases.
    - pending_evaluations: Total de videos que los alumnos aun no han completado.
    - average_score: Promedio (Mock por ahora).
    """
    try:
        user_id = current_user.id
        
        # 1. Obtener clases del profesor
        classes_res = supabase.table("classes").select("id, name").eq("professor_id", user_id).execute()
        class_ids = [c['id'] for c in classes_res.data]
        class_map = {c['id']: c['name'] for c in classes_res.data}
        
        if not class_ids:
            return {
                "total_students": 0,
                "pending_evaluations": 0,
                "active_classes": 0,
                "average_score": 0,
                "recent_evaluations": []
            }

        # 2. Total Estudiantes (Matriculados)
        enrollments_res = supabase.table("class_enrollments").select("student_id, class_id").in_("class_id", class_ids).execute()
        enrollments_data = enrollments_res.data
        total_students = len(enrollments_data)
        
        # 3. Evaluaciones Pendientes
        tasks_res = supabase.table("tasks").select("id, class_id, title, created_at").in_("class_id", class_ids).order("created_at", desc=True).limit(10).execute()
        tasks_data = tasks_res.data
        task_ids = [t['id'] for t in tasks_data]
        
        class_student_counts = {}
        for e in enrollments_data:
            cid = e['class_id']
            class_student_counts[cid] = class_student_counts.get(cid, 0) + 1
            
        total_expected_views = 0
        all_tasks_res = supabase.table("tasks").select("id, class_id").in_("class_id", class_ids).execute()
        task_class_map_all = {t['id']: t['class_id'] for t in all_tasks_res.data}

        for t in all_tasks_res.data:
            cid = t['class_id']
            students_in_class = class_student_counts.get(cid, 0)
            total_expected_views += students_in_class
            
        all_task_ids = [t['id'] for t in all_tasks_res.data]
        completed_count = 0
        
        # Pre-calcular promedios de clase
        class_averages = {}
        
        if all_task_ids:
            sessions_res = supabase.table("activity_sessions") \
                .select("id, task_id, status") \
                .in_("task_id", all_task_ids) \
                .execute() # Traemos todas para contar completadas y calcular promedios
            
            completed_sessions = [s for s in sessions_res.data if s['status'] == 'completed']
            completed_count = len(completed_sessions)
            
            # Calcular promedios de clase
            comp_sess_ids = [s['id'] for s in completed_sessions]
            sess_task_map = {s['id']: s['task_id'] for s in completed_sessions}
            
            if comp_sess_ids:
                quizzes_res = supabase.table("generated_quizzes").select("session_id, score_obtained").in_("session_id", comp_sess_ids).execute()
                
                class_scores_acc = {}
                for q in quizzes_res.data:
                    if q.get('score_obtained') is not None:
                         sid = q['session_id']
                         tid = sess_task_map.get(sid)
                         cid = task_class_map_all.get(tid)
                         
                         if cid:
                             if cid not in class_scores_acc: class_scores_acc[cid] = []
                             class_scores_acc[cid].append(float(q['score_obtained']))
                
                for cid, scores_list in class_scores_acc.items():
                    class_averages[cid] = sum(scores_list) / len(scores_list)
            
            
        pending = total_expected_views - completed_count
        if pending < 0: 
            pending = 0

        # 4. Ultimas Evaluaciones (Promedio por Tarea)
        recent_evals = []
        seen_classes = set()

        for task in tasks_data:
             cid = task['class_id']
             if cid in seen_classes:
                 continue

             # a. Buscar sesiones completadas para esta tarea ESPECIFICA (para avg de la tarea)
             # Podriamos reutilizar completed_sessions filtrando, pero por claridad y volumen bajo (10) dejamos logica o filtramos en memoria
             task_sess_ids = [s['id'] for s in sessions_res.data if s['task_id'] == task['id'] and s['status'] == 'completed']
             
             scores = []
             if task_sess_ids:
                 # Necesitamos notas de estas sesiones. Si ya las trajimos arriba (en quizzes_res), filtramos en memoria si es posible
                 # Pero quizzes_res solo tiene de completed_sessions globales. Sí sirve.
                 # Hacemos query puntual para asegurar consistencia con logica anterior o filtramos. Query es seguro.
                 t_quizzes_res = supabase.table("generated_quizzes").select("score_obtained").in_("session_id", task_sess_ids).execute()
                 for q in t_quizzes_res.data:
                     if q.get('score_obtained') is not None:
                         scores.append(float(q['score_obtained']))
             
             avg_score = 0
             if scores:
                 avg_score = sum(scores) / len(scores)
            
             class_avg = class_averages.get(task['class_id'], 0)

             seen_classes.add(cid)
             recent_evals.append({
                 "id": task['id'],
                 "title": task.get('title', 'Evaluación'),
                 "time_ago": task.get('created_at', '').split('T')[0], 
                 "average_score": round(avg_score, 1),
                 "code": (task.get('title') or "EVA")[:3].upper(),
                 "class_name": class_map.get(task['class_id'], "Clase desconocida"),
                 "class_average": round(class_avg, 1)
             })
             
             if len(recent_evals) >= 3:
                 break

        return {
            "total_students": total_students,
            "pending_evaluations": pending,
            "active_classes": len(classes_res.data),
            "average_score": 8.4,
            "recent_evaluations": recent_evals
        }

    except Exception as e:
        print(f"Error calculating stats: {e}")
        # Retornar ceros en error para no romper dashboard, incluyendo lista vacia
        return {
            "total_students": 0,
            "pending_evaluations": 0,
            "active_classes": 0,
            "average_score": 0,
            "recent_evaluations": []
        }


@router.get("/admin-dashboard")
async def get_admin_dashboard_stats(current_user: any = Depends(get_current_user)):
    """
    Estadísticas para el dashboard de administrador.
    """
    try:
        # 1. Total Usuarios (Activos: ctr_estado=1)
        try:
            total_users_res = supabase.table("profiles").select("user_id", count="exact").eq("ctr_estado", 1).execute()
            total_users = total_users_res.count if total_users_res.count is not None else 0
        except Exception:
            # Fallback
            total_users_res = supabase.table("profiles").select("user_id", count="exact").execute()
            total_users = total_users_res.count if total_users_res.count is not None else 0

        # 2. Estudiantes Activos (role=3, ctr_estado=1)
        # Intentamos filtrar por ctr_estado (asumiendo que existe en profiles con esa ortografía)
        try:
            active_students_res = supabase.table("profiles") \
                .select("user_id", count="exact") \
                .eq("role", 3) \
                .eq("ctr_estado", 1) \
                .execute()
            active_students = active_students_res.count if active_students_res.count is not None else 0
        except Exception:
             # Fallback si la columna no existe o error: contar solo por rol
             print("Warning: Could not filter profiles by ctr_estado. Counting all students.")
             fallback_res = supabase.table("profiles").select("user_id", count="exact").eq("role", 3).execute()
             active_students = fallback_res.count if fallback_res.count is not None else 0

        # 3. Clases Creadas (Activas/No eliminadas logicamente)
        # Nota: en classes la columna es 'ctr_esatdo' (typo conocido)
        total_classes_res = supabase.table("classes").select("id", count="exact").eq("ctr_esatdo", 1).execute()
        total_classes = total_classes_res.count if total_classes_res.count is not None else 0

        # 4. Distribución de Roles
        # Contamos usuarios activos por rol
        # Role 1: Admin, 2: Profesor, 3: Estudiante
        roles_dist = {"admin": 0, "professor": 0, "student": 0}
        
        try:
            # Podríamos hacer 3 queries o 1 query y agrupar en python (depende del volumen, aqui es bajo)
            # Hacemos 1 query y procesamos
            profiles_res = supabase.table("profiles").select("role").eq("ctr_estado", 1).execute()
            for p in profiles_res.data:
                r = p.get('role')
                if r == 1: roles_dist['admin'] += 1
                elif r == 2: roles_dist['professor'] += 1
                elif r == 3: roles_dist['student'] += 1
        except Exception as e:
            print(f"Error role dist: {e}")

        # 5. Actividad de Inicio de Sesión (Usando Sessiones de Estudio como proxy)
        # Últimos 7 días
        activity_last_7_days = []
        try:
            from datetime import timedelta
            now = datetime.utcnow()
            start_date = now - timedelta(days=6) # 7 dias incluyendo hoy
            
            # Traer sesiones de los ultimos 7 dias
            sessions_res = supabase.table("activity_sessions") \
                .select("started_at") \
                .gte("started_at", start_date.isoformat()) \
                .execute()
                
            # Agrupar por dia
            # Inicializar con 0 para los ultimos 7 dias
            days_map = {}
            for i in range(7):
                d = start_date + timedelta(days=i)
                day_key = d.strftime("%Y-%m-%d")
                # Nombre dia español
                day_name = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][d.weekday()]
                days_map[day_key] = {"date": day_key, "day": day_name, "count": 0}
            
            for s in sessions_res.data:
                # s['started_at'] es ISO string. Cortamos al dia
                s_date = s['started_at'].split('T')[0]
                if s_date in days_map:
                    days_map[s_date]['count'] += 1
            
            activity_last_7_days = list(days_map.values())
            # Asegurar orden cronologico
            activity_last_7_days.sort(key=lambda x: x['date'])
            
        except Exception as e:
            print(f"Error activity stats: {e}")

        # 6. Actividad Reciente del Sistema (Inferencia)
        # Tipos: created (Nuevo usuario), modified (Rol modificado), deleted (Usuario eliminado)
        system_activity = []
        
        # a) Nuevos Usuarios (created_at desc) - Esto DEBERIA funcionar (created_at suele existir)
        try:
             new_users_res = supabase.table("profiles").select("full_name, role, created_at").order("created_at", desc=True).limit(5).execute()
             for u in new_users_res.data:
                 if not u.get('created_at'): continue
                 
                 role_name = "Usuario"
                 r = u.get('role')
                 if r == 1: role_name = "Administrador"
                 elif r == 2: role_name = "Profesor"
                 elif r == 3: role_name = "Estudiante"

                 system_activity.append({
                     "type": "created",
                     "icon": "person_add",
                     "color": "blue",
                     "title": "Nuevo usuario creado",
                     "description": f"{u.get('full_name')} registrada como {role_name}",
                     "timestamp": u.get('created_at')
                 })
        except Exception as e:
            print(f"Error fetching new users: {e}")
            
        # b) Usuarios Eliminados (ctr_estado=0)
        try:
             # Intentamos ordenar por updated_at si existe, si no, ignoramos orden preciso o usamos created_at como fallback
             # Para evitar el error "column profiles.updated_at does not exist", intentamos un select simple primero
             # Si falla la query, capturamos excepcion y no agregamos nada.
             deleted_users_res = supabase.table("profiles").select("full_name, updated_at").eq("ctr_estado", 0).order("updated_at", desc=True).limit(5).execute()
             for u in deleted_users_res.data:
                 if not u.get('updated_at'): continue
                 system_activity.append({
                     "type": "deleted",
                     "icon": "delete",
                     "color": "red",
                     "title": "Usuario eliminado",
                     "description": f"Usuario {u.get('full_name')} inactivo eliminado del sistema",
                     "timestamp": u.get('updated_at')
                 })
        except Exception:
             # Silenciosamente fallamos si no existe updated_at o algo asi
             pass

        # c) Rol Modificado / Actualización (ctr_estado=1)
        try:
             modified_users_res = supabase.table("profiles").select("full_name, role, updated_at, created_at").eq("ctr_estado", 1).order("updated_at", desc=True).limit(5).execute()
             for u in modified_users_res.data:
                 if not u.get('updated_at'): continue
                 
                 c_at = u.get('created_at', '')
                 u_at = u.get('updated_at', '')
                 
                 if c_at == u_at: continue 
                 
                 role_name = "Usuario"
                 r = u.get('role')
                 if r == 1: role_name = "Administrador"
                 elif r == 2: role_name = "Profesor"
                 elif r == 3: role_name = "Estudiante"

                 system_activity.append({
                     "type": "modified",
                     "icon": "edit",
                     "color": "purple",
                     "title": "Rol modificado",
                     "description": f"{u.get('full_name')} actualizado a {role_name}",
                     "timestamp": u_at
                 })
        except Exception:
             pass

        # Ordenar y cortar
        try:
             system_activity.sort(key=lambda x: x['timestamp'], reverse=True)
             system_activity = system_activity[:4] # Top 4
             
             # Formatear tiempo relativo (simple)
             from datetime import datetime
             now = datetime.utcnow()
             for item in system_activity:
                 # Parse timestamp
                 try:
                    ts_str = item['timestamp'].replace('Z', '')
                    if '.' in ts_str:
                        ts_str = ts_str.split('.')[0]
                    
                    ts_dt = datetime.fromisoformat(ts_str)
                    diff = now - ts_dt
                    
                    seconds = diff.total_seconds()
                    if seconds < 60: item['time'] = "Hace un momento"
                    elif seconds < 3600: item['time'] = f"Hace {int(seconds/60)} minutos"
                    elif seconds < 86400: item['time'] = f"Hace {int(seconds/3600)} horas"
                    else: item['time'] = f"Hace {int(seconds/86400)} días"
                 except Exception:
                     item['time'] = "Hace un momento"
        except Exception as e:
            print(f"Error processing activity list: {e}")


        return {
            "total_users": total_users,
            "active_students": active_students,
            "total_classes": total_classes,
            "roles_distribution": roles_dist,
            "activity_chart": activity_last_7_days,
            "system_activity": system_activity
        }
    except Exception as e:
        print(f"Error admin stats: {e}")
        return {"total_users": 0, "active_students": 0, "total_classes": 0}


@router.get("/class-report/{class_id}")
async def get_class_report(class_id: str, current_user: any = Depends(get_current_user)):
    """
    Retorna métricas y detalle de estudiantes para una clase.
    """
    try:
        # 1. Obtener tareas de la clase
        tasks_res = supabase.table("tasks").select("id, title").eq("class_id", class_id).execute()
        tasks_data = tasks_res.data
        task_ids = [t['id'] for t in tasks_data]
        task_map = {t['id']: t['title'] for t in tasks_data}

        # 2. Obtener Estudiantes Matriculados
        # Intentamos obtener info de perfil si es posible, sino solo IDs
        # Asumimos que class_enrollments tiene student_id. Deberia haber una tabla de perfiles publica.
        enrollments_res = supabase.table("class_enrollments").select("student_id").eq("class_id", class_id).execute()
        student_ids = [e['student_id'] for e in enrollments_res.data]
        
        # Obtener perfiles (full_name, email)
        students_info = {}
        if student_ids:
            try:
                # Corregido: Buscar por user_id, no id, ya que profiles usa user_id como FK
                # Corregido 2: Eliminar avatar_url que no existe
                profiles_res = supabase.table("profiles").select("user_id, full_name, email").in_("user_id", student_ids).execute()
                for p in profiles_res.data:
                    students_info[p['user_id']] = p
            except Exception as e:
                # Fallback si no existe tabla profiles o error de permisos
                print(f"Warning: Could not fetch profiles: {e}")
                for sid in student_ids:
                    students_info[sid] = {"user_id": sid, "full_name": "Estudiante", "email": "email@example.com"}

        # 3. Obtener sesiones y notas de todos los estudiantes de la clase
        # Solo sesiones completadas de las tareas de esta clase
        all_sessions_res = supabase.table("activity_sessions") \
            .select("id, student_id, task_id, attention_level, generated_quizzes(score_obtained, id)") \
            .in_("task_id", task_ids) \
            .eq("status", "completed") \
            .execute()
            
        # Organizar datos por estudiante
        student_data_map = {} # { student_id: { scores: [], sessions: [] } }
        
        # Inicializar para todos los matriculados (incluso los que no tienen notas)
        for sid in student_ids:
            student_data_map[sid] = {"scores": [], "evaluations": [], "attention_levels": []}

        for sess in all_sessions_res.data:
            sid = sess['student_id']
            if sid not in student_data_map:
                continue # Estudiante no matriculado o error data
                
            # Extraer nota
            score = 0
            has_score = False
            quizzes = sess.get('generated_quizzes', [])
            if quizzes and len(quizzes) > 0 and quizzes[0].get('score_obtained') is not None:
                score = float(quizzes[0].get('score_obtained'))
                has_score = True
                student_data_map[sid]["scores"].append(score)
            
            # Datos para el modal (Evaluacion individual)
            task_title = task_map.get(sess['task_id'], "Evaluación")
            
            # Mapear nivel de atencion a % mock para frontend ya que DB tiene texto
            att_map = {"alto": 95, "medio": 75, "bajo": 45}
            att_val = att_map.get(sess.get('attention_level'), 70)
            student_data_map[sid]["attention_levels"].append(att_val)

            if has_score:
                student_data_map[sid]["evaluations"].append({
                    "title": task_title,
                    "score": score,
                    "max_score": 20, # Asumido
                    "date": "Reciente" # Podriamos traer created_at
                })

        # Construir lista final de estudiantes
        students_list = []
        all_class_scores = []
        
        passed_count_global = 0
        failed_count_global = 0
        
        for sid in student_ids:
            data = student_data_map[sid]
            info = students_info.get(sid, {"full_name": "Estudiante", "email": "N/A"})
            
            avg = 0
            if data["scores"]:
                avg = sum(data["scores"]) / len(data["scores"])
                all_class_scores.extend(data["scores"])
            
            # Estado
            status = "En Riesgo"
            if avg >= 18: status = "Excelente"
            elif avg >= 14: status = "Aprobado"
            
            if avg >= 14: passed_count_global += 1
            else: failed_count_global += 1
            
            # Promedio Atencion
            avg_att = 0
            if data["attention_levels"]:
                avg_att = sum(data["attention_levels"]) / len(data["attention_levels"])
            
            students_list.append({
                "id": sid, # O un ID corto visual
                "name": info.get("full_name", "Desconocido"),
                "email": info.get("email", ""),
                "avatar": info.get("avatar_url") or f"https://ui-avatars.com/api/?name={info.get('full_name', 'User')}&background=random",
                "promedio": round(avg, 1),
                "atencion": round(avg_att),
                "estado": status,
                "evaluations": data["evaluations"] # Para el modal
            })

        # Calculos Globales
        class_average = sum(all_class_scores) / len(all_class_scores) if all_class_scores else 0
        total_students = len(student_ids)
        approval_rate = (passed_count_global / total_students * 100) if total_students > 0 else 0
        failure_rate = (failed_count_global / total_students * 100) if total_students > 0 else 0
        
        return {
            "average": round(class_average, 1),
            "approval_rate": round(approval_rate, 1),
            "failure_rate": round(failure_rate, 1),
            "failed_count": failed_count_global,
            "total_students_active": total_students,
            "students": students_list
        }

    except Exception as e:
        print(f"Error report: {e}")
        import traceback
        traceback.print_exc()
        return {"average": 0, "approval_rate": 0, "failure_rate": 0, "total_students": 0, "failed_count": 0, "students": []}
