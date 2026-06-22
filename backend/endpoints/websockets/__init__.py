"""
Módulo de WebSockets para actualizaciones en tiempo real.
"""
from endpoints.websockets import blink_count, blink_detection, connection_manager

__all__ = ["blink_count", "blink_detection", "connection_manager"]
