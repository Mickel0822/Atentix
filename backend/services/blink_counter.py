"""
Módulo para gestionar el contador global de parpadeos.
Proporciona funciones para incrementar, resetear y consultar el contador.
"""

_blink_count: int = 0


def increment_blink_count() -> int:
    """
    Incrementa el contador global de parpadeos en 1.
    
    Returns:
        int: El nuevo valor del contador después del incremento
    """
    global _blink_count
    _blink_count += 1
    return _blink_count


def reset_blink_count() -> None:
    """
    Resetea el contador global de parpadeos a 0.
    """
    global _blink_count
    _blink_count = 0


def get_blink_count() -> int:
    """
    Obtiene el valor actual del contador global de parpadeos.
    
    Returns:
        int: El valor actual del contador
    """
    return _blink_count

