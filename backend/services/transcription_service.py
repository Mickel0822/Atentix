import whisper
import os
import uuid
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Asegurar que ffmpeg esté en el PATH
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FFMPEG_BIN = os.path.join(BASE_DIR, "bin") # backend/bin
if os.path.exists(FFMPEG_BIN) and FFMPEG_BIN not in os.environ["PATH"]:
    os.environ["PATH"] += os.pathsep + FFMPEG_BIN
    print(f"[TranscriptionService] Añadido ffmpeg al PATH: {FFMPEG_BIN}")

class TranscriptionService:
    def __init__(self):
        self.model = None
        self.tasks = {} # Almacenamiento en memoria: {task_id: {"status": "pending"|"processing"|"completed"|"failed", "text": ..., "error": ...}}
        self.executor = ThreadPoolExecutor(max_workers=1) # Solo una transcripción a la vez para no saturar CPU/GPU

    def load_model(self):
        if not self.model:
            print("[TranscriptionService] 📥 Cargando modelo Whisper 'base'...")
            # 'base' es un buen equilibrio. 'tiny' es muy rápido pero menos preciso. 'small' es mejor.
            self.model = whisper.load_model("base")
            print("[TranscriptionService] ✅ Modelo Whisper cargado.")

    def _run_transcription(self, task_id: str, video_path: str):
        try:
            self.tasks[task_id]["status"] = "processing"
            print(f"[TranscriptionService] 🎙️ Iniciando transcripción para tarea {task_id}...")
            
            # Cargar modelo si no existe (lazy loading en el hilo del worker o antes)
            # Nota: whisper.load_model descarga el modelo si no está en caché
            if not self.model:
                self.load_model()
            
            # Transcribir
            result = self.model.transcribe(video_path, fp16=False) # fp16=False para compatibilidad CPU si no hay CUDA
            text = result["text"].strip()
            
            self.tasks[task_id]["status"] = "completed"
            self.tasks[task_id]["text"] = text
            print(f"[TranscriptionService] ✅ Transcripción completada para {task_id}")
            
        except Exception as e:
            print(f"[TranscriptionService] ❌ Error en transcripción {task_id}: {e}")
            self.tasks[task_id]["status"] = "failed"
            self.tasks[task_id]["error"] = str(e)
        finally:
            # Limpieza del archivo temporal
            if os.path.exists(video_path):
                try:
                    os.remove(video_path)
                except:
                    pass

    def start_transcription(self, video_path: str) -> str:
        task_id = str(uuid.uuid4())
        self.tasks[task_id] = {"status": "pending", "text": None}
        
        # Ejecutar en background (ThreadPool) para no bloquear el loop de asyncio
        # FastAPI BackgroundTasks ejecuta en threadpool por defecto, pero aquí lo gestionamos manualmente 
        # para tener control sobre el Executor si quisieramos. 
        # Sin embargo, para integrarlo con FastAPI limpio, lo ideal es llamar a este método 
        # y que este método lance el futuro.
        
        self.executor.submit(self._run_transcription, task_id, video_path)
        
        return task_id

    def get_task_status(self, task_id: str):
        return self.tasks.get(task_id, None)

transcription_service = TranscriptionService()
