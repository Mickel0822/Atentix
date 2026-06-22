import os
import asyncio
from supabase import create_client

# Configuración manual para debug (usar valores de .env si es necesario, aquí asumo que el entorno tiene acceso o hardcodeo para probar)
# NOTA: Como no tengo las keys reales aquí, intentaré leerlas de os.environ o del archivo local si pudiera, 
# pero asumiré que el entorno de ejecución del usuario tiene las variables cargadas o el cliente ya configurado.
# Voy a intentar importar settings.

import sys
sys.path.append(os.getcwd()) # Asegurar que backend está en path

try:
    from core.config import settings
    supabase_url = settings.supabase_url
    supabase_key = settings.supabase_key
except ImportError:
    print("No se pudo importar settings. Asegúrate de correr esto desde 'backend/'")
    exit(1)

supabase = create_client(supabase_url, supabase_key)

# IDs del caso de prueba del usuario
CLASS_ID = '5ecc6b3b-f015-42a0-9394-a3c731273462'
STUDENT_ID = '32545b5a-71d3-4348-bc25-e0e4b8e31fa8'

def debug_get_results():
    print(f"--- DEBUGGING RESULTS FOR ---")
    print(f"Class ID: {CLASS_ID}")
    print(f"Student ID: {STUDENT_ID}")
    
    # 1. Obtener tasks
    print("\n1. Fetching Tasks...")
    tasks_res = supabase.table("tasks").select("id, title").eq("class_id", CLASS_ID).execute()
    tasks = tasks_res.data
    print(f"Found {len(tasks)} tasks.")
    for t in tasks:
        print(f" - {t['title']} ({t['id']})")
        
    if not tasks:
        print("No tasks found. Exiting.")
        return

    # 2. Obtener sessions
    task_ids = [t['id'] for t in tasks]
    print(f"\n2. Fetching Sessions for {len(task_ids)} tasks...")
    
    sessions_res = supabase.table("activity_sessions") \
            .select("*, generated_quizzes(id, score_obtained, completed_at, created_at)") \
            .eq("student_id", STUDENT_ID) \
            .in_("task_id", task_ids) \
            .order("started_at", desc=True) \
            .execute()
    
    sessions_data = sessions_res.data
    print(f"Found {len(sessions_data)} sessions raw.")
    
    # Agrupar
    sessions_by_task = {}
    for s in sessions_data:
        tid = s['task_id']
        if tid not in sessions_by_task:
            sessions_by_task[tid] = []
        sessions_by_task[tid].append(s)
        
        # Debug print quiz data for each session
        quizzes = s.get('generated_quizzes', [])
        print(f" Session {s['id']} (Task {tid}) -> Quizzes: {len(quizzes)}")
        if quizzes:
            print(f"   Quiz Data: {quizzes}")

    # 3. Logic selection
    print("\n3. Applying Logic Selection...")
    
    final_results = []
    for task in tasks:
        print(f"\nProcessing Task: {task['title']}")
        task_sessions = sessions_by_task.get(task['id'], [])
        print(f"  Total sessions: {len(task_sessions)}")
        
        selected_session = None
        for s in task_sessions:
            qz = s.get('generated_quizzes', [])
            if qz and len(qz) > 0:
                print(f"  -> Found session with quiz! {s['id']}")
                selected_session = s
                break
        
        if not selected_session and task_sessions:
            print(f"  -> No quiz session found, picking newest: {task_sessions[0]['id']}")
            selected_session = task_sessions[0]
            
        if selected_session:
            qz = selected_session.get('generated_quizzes', [])
            print(f"  SELECTED Status: {selected_session['status']}")
            print(f"  SELECTED Quizzes: {qz}")
        else:
            print("  NO SESSION FOUND.")

if __name__ == "__main__":
    debug_get_results()
