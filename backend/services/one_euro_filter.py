"""
Implementación del Filtro 1-Euro para suavizado de señales.

El filtro 1-Euro es un filtro adaptativo de bajo retraso que reduce el jitter
en datos de entrada de alta frecuencia, ideal para datos de pose y mirada.

Referencias:
- Casiez, G., Roussel, N., & Vogel, D. (2012). 1€ Filter: A Simple Speed-based
  Low-pass Filter for Noisy Input in Interactive Systems.
"""
import math
from typing import Optional


class LowPassFilter:
    """Filtro de paso bajo simple con factor de suavizado alpha."""
    
    def __init__(self, alpha: float = 1.0):
        self.alpha = alpha
        self.y: Optional[float] = None
        self.s: Optional[float] = None
    
    def filter(self, value: float) -> float:
        """Aplica el filtro de paso bajo al valor dado."""
        if self.y is None:
            self.s = value
        else:
            self.s = self.alpha * value + (1.0 - self.alpha) * self.s
        self.y = value
        return self.s
    
    def reset(self):
        """Reinicia el estado del filtro."""
        self.y = None
        self.s = None


class OneEuroFilter:
    """
    Filtro 1-Euro para suavizado adaptativo de señales.
    
    Parámetros:
        freq: Frecuencia de muestreo esperada (Hz)
        min_cutoff: Frecuencia de corte mínima (Hz). Valores más bajos = más suave
        beta: Coeficiente de velocidad. Valores más altos = menos retraso en movimientos rápidos
        d_cutoff: Frecuencia de corte para la derivada (Hz)
    """
    
    def __init__(
        self, 
        freq: float = 15.0,
        min_cutoff: float = 1.0, 
        beta: float = 0.007, 
        d_cutoff: float = 1.0
    ):
        self.freq = freq
        self.min_cutoff = min_cutoff
        self.beta = beta
        self.d_cutoff = d_cutoff
        
        self.x_filter = LowPassFilter(self._alpha(min_cutoff))
        self.dx_filter = LowPassFilter(self._alpha(d_cutoff))
        
        self.last_time: Optional[float] = None
    
    def _alpha(self, cutoff: float) -> float:
        """Calcula el factor de suavizado alpha basado en la frecuencia de corte."""
        tau = 1.0 / (2.0 * math.pi * cutoff)
        te = 1.0 / self.freq
        return 1.0 / (1.0 + tau / te)
    
    def filter(self, value: float, timestamp: Optional[float] = None) -> float:
        """
        Aplica el filtro 1-Euro al valor dado.
        
        Args:
            value: El valor a filtrar
            timestamp: Tiempo actual en segundos (opcional, usa frecuencia fija si no se proporciona)
            
        Returns:
            El valor filtrado (suavizado)
        """
        # Actualizar frecuencia si se proporciona timestamp
        if timestamp is not None and self.last_time is not None:
            dt = timestamp - self.last_time
            if dt > 0:
                self.freq = 1.0 / dt
        self.last_time = timestamp
        
        # Calcular derivada (velocidad de cambio)
        prev_x = self.x_filter.y
        if prev_x is None:
            dx = 0.0
        else:
            dx = (value - prev_x) * self.freq
        
        # Filtrar la derivada
        edx = self.dx_filter.filter(dx)
        
        # Calcular frecuencia de corte adaptativa
        cutoff = self.min_cutoff + self.beta * abs(edx)
        
        # Actualizar alpha y filtrar el valor
        self.x_filter.alpha = self._alpha(cutoff)
        return self.x_filter.filter(value)
    
    def reset(self):
        """Reinicia el estado del filtro."""
        self.x_filter.reset()
        self.dx_filter.reset()
        self.last_time = None


class MultiDimensionalOneEuroFilter:
    """
    Filtro 1-Euro para vectores multidimensionales (ej: [yaw, pitch, roll]).
    """
    
    def __init__(
        self, 
        dimensions: int = 3,
        freq: float = 15.0,
        min_cutoff: float = 1.0, 
        beta: float = 0.007, 
        d_cutoff: float = 1.0
    ):
        self.filters = [
            OneEuroFilter(freq, min_cutoff, beta, d_cutoff) 
            for _ in range(dimensions)
        ]
    
    def filter(self, values: list[float], timestamp: Optional[float] = None) -> list[float]:
        """
        Aplica el filtro 1-Euro a cada dimensión del vector.
        
        Args:
            values: Lista de valores a filtrar [v1, v2, ...]
            timestamp: Tiempo actual en segundos
            
        Returns:
            Lista de valores filtrados
        """
        return [
            f.filter(v, timestamp) 
            for f, v in zip(self.filters, values)
        ]
    
    def reset(self):
        """Reinicia todos los filtros."""
        for f in self.filters:
            f.reset()
