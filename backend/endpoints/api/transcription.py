from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Form
from services.transcription_service import transcription_service
from services.video_service import video_service
import shutil
import os
import aiohttp
from tempfile import NamedTemporaryFile

router = APIRouter(
    prefix="/transcribe",
    tags=["Transcription"]
)

@router.post("/video")
async def transcribe_video(
    file: UploadFile = File(None),
    video_url: str = Form(None)
):
    """
    Sube un video o usa una URL y comienza la transcripción en segundo plano.
    Retorna un task_id para consultar el estado.
    """
    temp_path = ""
    try:
        if file:
            # Guardar archivo temporalmente
            temp_path = await video_service.save_upload_locally(file)
        elif video_url:
             # Descargar video de la URL
             async with aiohttp.ClientSession() as session:
                async with session.get(video_url) as resp:
                    if resp.status != 200:
                        raise HTTPException(status_code=400, detail="No se pudo descargar el video de la URL")
                    
                    suffix = "." + video_url.split('.')[-1] if '.' in video_url else ".mp4"
                    # Sanitizar sufijo para evitar errores extraños
                    if len(suffix) > 5 or "/" in suffix: suffix = ".mp4"

                    with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                        temp_path = tmp.name
                        tmp.write(await resp.read())
        else:
            raise HTTPException(status_code=400, detail="Debe proporcionar un archivo o video_url")
        
        # Iniciar transcripción
        task_id = transcription_service.start_transcription(temp_path)
        
        return {
            "task_id": task_id,
            "status": "processing",
            "message": "Transcripción iniciada exitosamente"
        }
    except Exception as e:
        if temp_path and os.path.exists(temp_path):
            try: os.remove(temp_path)
            except: pass
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{task_id}")
async def get_transcription_status(task_id: str):
    """
    Consulta el estado de una tarea de transcripción.
    """
    task = transcription_service.get_task_status(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    return task
