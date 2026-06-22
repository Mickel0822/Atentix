"""
WebSocket para enviar actualizaciones en tiempo real del contador de parpadeos.
"""
import asyncio
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.routing import APIRouter

from core.config import settings
from endpoints.websockets.connection_manager import ConnectionManager
from services.blink_counter import get_blink_count

router = APIRouter()

# Instancia del gestor de conexiones para este WebSocket
manager = ConnectionManager()


@router.websocket("/ws/blink/count")
async def websocket_blink_count(websocket: WebSocket):
    """
    WebSocket endpoint para recibir actualizaciones en tiempo real del contador de parpadeos.
    
    El cliente se conecta a este endpoint y recibe actualizaciones cuando el contador cambia.
    Se verifica periódicamente si el contador ha cambiado y se envía la actualización.
    """
    await manager.connect(websocket)
    
    try:
        # Enviar el contador inicial inmediatamente
        initial_count = get_blink_count()
        await manager.send_json_message({"blink_count": initial_count}, websocket)
        
        last_count = initial_count
        
        # Mantener la conexión activa y enviar actualizaciones cuando cambie el contador
        while True:
            # Esperar mensajes del cliente o timeout para verificar cambios
            try:
                # Timeout configurable para verificar actualizaciones periódicamente
                data = await asyncio.wait_for(websocket.receive_text(), timeout=settings.websocket_check_interval)
                # Si el cliente envía un mensaje, mantener la conexión viva
            except asyncio.TimeoutError:
                # Verificar si el contador ha cambiado
                current_count = get_blink_count()
                if current_count != last_count:
                    # Solo enviar si el contador cambió
                    await manager.send_json_message({"blink_count": current_count}, websocket)
                    last_count = current_count
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
