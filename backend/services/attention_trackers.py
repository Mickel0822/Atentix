from typing import Optional


class BlinkRateTracker:
    """Tracker para calcular la tasa de parpadeo por minuto."""

    def __init__(self, window_seconds: float = 60.0):
        self.window_seconds = window_seconds
        self.blink_timestamps: list[float] = []
        self.last_blink_state: bool = False

    def update(self, is_blinking: bool, timestamp: float) -> float:
        if is_blinking and not self.last_blink_state:
            self.blink_timestamps.append(timestamp)

        self.last_blink_state = is_blinking
        cutoff = timestamp - self.window_seconds
        self.blink_timestamps = [t for t in self.blink_timestamps if t > cutoff]

        if len(self.blink_timestamps) < 2:
            return 13.0

        time_span = timestamp - self.blink_timestamps[0]
        if time_span > 0:
            blinks_per_minute = (len(self.blink_timestamps) / time_span) * 60.0
            return min(blinks_per_minute, 60.0)

        return 13.0

    def reset(self):
        self.blink_timestamps = []
        self.last_blink_state = False


class DrowsinessTracker:
    """Tracker para detectar somnolencia (ojos cerrados por tiempo prolongado)."""

    def __init__(self, threshold_seconds: float = 2.0):
        self.threshold_seconds = threshold_seconds
        self.eyes_closed_start_time: Optional[float] = None
        self.is_asleep = False

    def update(self, eyes_closed: bool, timestamp: float) -> bool:
        """
        Actualiza el estado de somnolencia.

        Args:
            eyes_closed: True si los ojos están cerrados (EAR < umbral)
            timestamp: Tiempo actual

        Returns:
            True si está "durmiendo" (ojos cerrados > umbral)
        """
        if not eyes_closed:
            self.eyes_closed_start_time = None
            self.is_asleep = False
            return False

        if self.eyes_closed_start_time is None:
            self.eyes_closed_start_time = timestamp

        duration = timestamp - self.eyes_closed_start_time

        if duration > self.threshold_seconds:
            self.is_asleep = True

        return self.is_asleep

    def reset(self):
        self.eyes_closed_start_time = None
        self.is_asleep = False
