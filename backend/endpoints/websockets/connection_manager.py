"""
Módulo reutilizable para gestionar conexiones WebSocket.
Proporciona funcionalidades base que pueden ser utilizadas por cualquier WebSocket.
"""
import json
from typing import Set, Callable, Any, Dict
from fastapi import WebSocket


class ConnectionManager:
    """
    Gestor de conexiones WebSocket reutilizable.
    Maneja el registro, almacenamiento y broadcast a múltiples conexiones.
    """
    
    def __init__(self):
        """Inicializa el gestor de conexiones."""
        self.active_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket) -> None:
        """
        Acepta y registra una nueva conexión WebSocket.
        
        Args:
            websocket: Conexión WebSocket a registrar
        """
        await websocket.accept()
        self.active_connections.add(websocket)
    
    def disconnect(self, websocket: WebSocket) -> None:
        """
        Elimina una conexión del registro de conexiones activas.
        
        Args:
            websocket: Conexión WebSocket a eliminar
        """
        self.active_connections.discard(websocket)
    
    async def send_personal_message(self, message: str, websocket: WebSocket) -> None:
        """
        Envía un mensaje a una conexión específica.
        
        Args:
            message: Mensaje a enviar (debe ser string)
            websocket: Conexión WebSocket destino
        """
        try:
            await websocket.send_text(message)
        except Exception:
            # Si hay error, eliminar la conexión
            self.disconnect(websocket)
    
    async def send_json_message(self, data: Dict[str, Any], websocket: WebSocket) -> None:
        """
        Envía un mensaje JSON a una conexión específica.
        
        Args:
            data: Datos a enviar (serán serializados a JSON)
            websocket: Conexión WebSocket destino
        """
        message = json.dumps(data)
        await self.send_personal_message(message, websocket)
    
    async def broadcast(self, message: str) -> None:
        """
        Envía un mensaje a todas las conexiones activas.
        
        Args:
            message: Mensaje a enviar (debe ser string)
        """
        if not self.active_connections:
            return
        
        # Crear una copia de las conexiones para iterar (puede modificarse durante la iteración)
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                # Si hay un error al enviar, marcar la conexión para eliminarla
                disconnected.add(connection)
        
        # Eliminar conexiones desconectadas
        self.active_connections.difference_update(disconnected)
    
    async def broadcast_json(self, data: Dict[str, Any]) -> None:
        """
        Envía un mensaje JSON a todas las conexiones activas.
        
        Args:
            data: Datos a enviar (serán serializados a JSON)
        """
        message = json.dumps(data)
        await self.broadcast(message)
    
    def get_connection_count(self) -> int:
        """
        Obtiene el número de conexiones activas.
        
        Returns:
            int: Número de conexiones activas
        """
        return len(self.active_connections)
