"""
WebSocket para detectar parpadeos en tiempo real mediante imágenes enviadas por el cliente.
"""
import asyncio
import json
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.routing import APIRouter

from core.config import settings
from endpoints.websockets.connection_manager import ConnectionManager
from services.blink_detection_service import BlinkDetectionService
from services.blink_counter import increment_blink_count
from utils.image_utils import base64_to_opencv
from models.schemas import BlinkDetectionResponse

router = APIRouter()

# Instancia del gestor de conexiones para este WebSocket
manager = ConnectionManager()

# Servicios se inicializan de forma "lazy" para evitar errores de MediaPipe al importar
_blink_detection_service = None

def get_blink_detection_service():
    """Inicializa el servicio de detección de parpadeo solo cuando se necesita."""
    global _blink_detection_service
    if _blink_detection_service is None:
        _blink_detection_service = BlinkDetectionService(
            static_image_mode=True,
            max_num_faces=1
        )
    return _blink_detection_service


@router.websocket("/ws/detect/blink")
async def websocket_blink_detection(websocket: WebSocket):
    """
    WebSocket endpoint para detectar parpadeos en tiempo real.
    
    El cliente envía imágenes en Base64 a través del WebSocket y recibe
    la respuesta de detección de parpadeos (blinking, left_ear, right_ear).
    Si se detecta un parpadeo, se incrementa el contador automáticamente.
    
    Formato de mensaje esperado del cliente:
    {
        "image": "base64_encoded_image_string"
    }
    
    Formato de respuesta:
    {
        "blinking": bool,
        "left_ear": float,
        "right_ear": float
    }
    """
    await manager.connect(websocket)
    
    try:
        while True:
            # Recibir mensaje del cliente
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Validar que el mensaje contenga la imagen
                if "image" not in message:
                    await manager.send_json_message({
                        "error": "El mensaje debe contener el campo 'image' con la imagen en Base64"
                    }, websocket)
                    continue
                
                # Convertir Base64 a OpenCV
                try:
                    img = base64_to_opencv(message["image"])
                except Exception as e:
                    await manager.send_json_message({
                        "error": f"Error al procesar la imagen: {str(e)}"
                    }, websocket)
                    continue
                
                # Detectar parpadeo
                try:
                    result = get_blink_detection_service().detect_blink(img)
                    
                    # Incrementar contador si se detecta parpadeo
                    if result.blinking:
                        increment_blink_count()
                    
                    # Enviar respuesta al cliente
                    await manager.send_json_message({
                        "blinking": result.blinking,
                        "left_ear": result.left_ear,
                        "right_ear": result.right_ear
                    }, websocket)
                    
                except Exception as e:
                    # En caso de error en la detección, enviar valores por defecto
                    await manager.send_json_message({
                        "blinking": False,
                        "left_ear": 0.0,
                        "right_ear": 0.0,
                        "error": f"Error en la detección: {str(e)}"
                    }, websocket)
                    
            except json.JSONDecodeError:
                await manager.send_json_message({
                    "error": "El mensaje debe ser un JSON válido"
                }, websocket)
            except WebSocketDisconnect:
                break
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        # Manejar cualquier otro error
        pass
    finally:
        # Asegurarse de remover la conexión cuando se desconecte
        manager.disconnect(websocket)
