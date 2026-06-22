"""
Lógica pura para cálculo de métricas de atención.

Este módulo contiene funciones puras (sin estado) para calcular:
- Engagement Index (EI)
- Scores individuales de Gaze, Pose y Blink
- Estado de atención (engaged/distracted)

Fórmulas basadas en el documento de requisitos:
- EI = (wg * GazeScore) + (wp * PoseScore) + (wb * BlinkScore)
- Pesos: wg=0.5, wp=0.3, wb=0.2
"""
from dataclasses import dataclass
from typing import Literal
from core.config import settings


@dataclass
class AttentionMetrics:
    """Métricas completas de atención."""
    engagement_index: float
    gaze_score: float
    pose_score: float
    blink_score: float
    status: Literal["engaged", "distracted", "asleep"]
    warnings: list[str]

# Constante para detección de sueño (segundos)
DROWSINESS_THRESHOLD_SECONDS = 2.0


def calculate_gaze_score(gaze_yaw: float, threshold: float = None) -> float:
    """
    Calcula el score de mirada basado en el ángulo Yaw.
    
    Args:
        gaze_yaw: Ángulo horizontal de la mirada en grados
        threshold: Umbral en grados (default: 20°)
        
    Returns:
        1.0 si |gaze_yaw| < threshold, 0.0 en caso contrario
    """
    if threshold is None:
        threshold = getattr(settings, 'gaze_yaw_threshold', 20.0)
    
    if abs(gaze_yaw) < threshold:
        return 1.0
    return 0.0


def calculate_pose_score(
    head_yaw: float, 
    head_pitch: float,
    yaw_threshold: float = None,
    pitch_threshold: float = None
) -> float:
    """
    Calcula el score de pose basado en los ángulos Yaw y Pitch de la cabeza.
    
    Args:
        head_yaw: Ángulo horizontal de la cabeza en grados
        head_pitch: Ángulo vertical de la cabeza en grados
        yaw_threshold: Umbral de yaw (default: 25°)
        pitch_threshold: Umbral de pitch (default: 15°)
        
    Returns:
        Score entre 0.0 y 1.0
    """
    if yaw_threshold is None:
        yaw_threshold = getattr(settings, 'pose_yaw_threshold', 25.0)
    if pitch_threshold is None:
        pitch_threshold = getattr(settings, 'pose_pitch_threshold', 15.0)
    
    # Si cualquiera de los ángulos supera el umbral, score es 0
    if abs(head_yaw) > yaw_threshold or abs(head_pitch) > pitch_threshold:
        return 0.0
    
    # Calcular score gradual basado en qué tan lejos está del umbral
    yaw_ratio = 1.0 - (abs(head_yaw) / yaw_threshold)
    pitch_ratio = 1.0 - (abs(head_pitch) / pitch_threshold)
    
    # Promedio de ambos ratios
    return (yaw_ratio + pitch_ratio) / 2.0


def calculate_blink_score(
    blinks_per_minute: float,
    ideal_min: int = None,
    ideal_max: int = None
) -> float:
    """
    Calcula el score de parpadeo basado en la frecuencia.
    
    La frecuencia ideal de parpadeo es de 12-15 blinks/minuto.
    Muy pocos parpadeos pueden indicar concentración excesiva o fatiga.
    Demasiados parpadeos pueden indicar estrés o incomodidad.
    
    Args:
        blinks_per_minute: Tasa de parpadeos por minuto
        ideal_min: Mínimo ideal (default: 12)
        ideal_max: Máximo ideal (default: 15)
        
    Returns:
        Score entre 0.0 y 1.0
    """
    if ideal_min is None:
        ideal_min = getattr(settings, 'ideal_blink_rate_min', 12)
    if ideal_max is None:
        ideal_max = getattr(settings, 'ideal_blink_rate_max', 15)
    
    if ideal_min <= blinks_per_minute <= ideal_max:
        return 1.0
    
    # Penalización por estar fuera del rango ideal
    if blinks_per_minute < ideal_min:
        # Muy pocos parpadeos
        ratio = blinks_per_minute / ideal_min
        return max(0.0, ratio)
    else:
        # Demasiados parpadeos
        excess = blinks_per_minute - ideal_max
        penalty = excess / 20.0  # 20 blinks extra = score 0
        return max(0.0, 1.0 - penalty)


def calculate_ear_score(avg_ear: float) -> float:
    """
    Calcula un score basado en la apertura del ojo (EAR).
    
    Umbrales realistas:
    - >= 0.18: Ojos normalmente abiertos (score 1.0)
    - 0.13 - 0.18: Ojos semi-cerrados/somnolencia (score gradual)
    - <= 0.13: Ojos cerrados (score 0.0)
    
    Usa curva cuadrática para penalizar suavemente, no linealmente.
    """
    closed_thresh = getattr(settings, 'ear_distraction_threshold', 0.13)
    drowsy_thresh = getattr(settings, 'ear_drowsy_threshold', 0.18)
    
    if avg_ear >= drowsy_thresh:
        return 1.0
    
    if avg_ear <= closed_thresh:
        return 0.0
    
    # Penalización cuadrática suave (no lineal)
    # Esto hace que ojos "un poco cerrados" apenas pierdan score,
    # pero ojos realmente somnolientos sí se penalicen
    range_span = drowsy_thresh - closed_thresh
    ratio = (avg_ear - closed_thresh) / range_span  # 0.0 a 1.0
    return ratio ** 0.5  # Raíz cuadrada: más generoso que lineal



def calculate_ear_status(
    left_ear: float, 
    right_ear: float, 
    threshold: float = None
) -> tuple[bool, float]:
    """
    Determina si los ojos están cerrados basado en EAR.
    
    Args:
        left_ear: EAR del ojo izquierdo
        right_ear: EAR del ojo derecho
        threshold: Umbral de EAR (default: 0.22)
        
    Returns:
        Tuple (eyes_closed, avg_ear)
    """
    if threshold is None:
        threshold = getattr(settings, 'ear_distraction_threshold', 0.22)
    
    avg_ear = (left_ear + right_ear) / 2.0
    eyes_closed = avg_ear < threshold
    
    return eyes_closed, avg_ear


def calculate_engagement_index(
    gaze_score: float,
    pose_score: float,
    blink_score: float,
    weights: dict = None
) -> float:
    """
    Calcula el Índice de Engagement (EI) ponderado.
    
    EI = (wg * GazeScore) + (wp * PoseScore) + (wb * BlinkScore)
    
    Args:
        gaze_score: Score de mirada (0.0-1.0)
        pose_score: Score de pose (0.0-1.0)
        blink_score: Score de parpadeo (0.0-1.0)
        weights: Dict con pesos {"gaze": wg, "pose": wp, "blink": wb}
        
    Returns:
        Engagement Index entre 0.0 y 1.0
    """
    if weights is None:
        weights = getattr(settings, 'engagement_weights', {
            "gaze": 0.5,
            "pose": 0.3,
            "blink": 0.2
        })
    
    wg = weights.get("gaze", 0.5)
    wp = weights.get("pose", 0.3)
    wb = weights.get("blink", 0.2)
    
    ei = (wg * gaze_score) + (wp * pose_score) + (wb * blink_score)
    
    # Penalización por somnolencia (EAR Score)
    # Si ear_score < 1.0, reducimos el EI proporcionalmente
    # Pero no lo llevamos a 0 inmediatamente a menos que sea crítico
    if isinstance(weights, dict) and "ear_penalty_enabled" in weights:
        # Futura config
        pass
        
    # Aplicar factor de somnolencia directo
    # Si ear_score es 0.5 (semi-cerrado), el EI se reduce a la mitad? 
    # Mejor: Reducir max score posible.
    # O restar penalización.
    
    # Implementación simple: Multiplicar por ear_score (si es drowsy, baja el score)
    # Pero ear_score es 1.0 si > drowsy_thresh
    # Es 0.0 si < closed_thresh
    
    # Necesitamos el ear_score aquí. 
    # Como calculate_engagement_index es pura y no recibe ear, 
    # Debemos actualizar la firma o asumir que el caller lo maneja.
    # Vamos a actualizar la firma para recibir ear_score opcionalmente.
    pass 
    
    return max(0.0, min(1.0, ei))


def calculate_engagement_index_with_ear(
    gaze_score: float,
    pose_score: float,
    blink_score: float,
    ear_score: float = 1.0,
    weights: dict = None
) -> float:
    """
    Calcula EI considerando también el estado de apertura de ojos (Somnolencia).
    """
    base_ei = calculate_engagement_index(gaze_score, pose_score, blink_score, weights)
    
    # Si ear_score baja (ojos cerrándose), el engagement cae drásticamente
    # Ejemplo: ear_score 0.5 -> EI * 0.5
    return base_ei * ear_score
    
    # Asegurar que esté en el rango [0, 1]
    return max(0.0, min(1.0, ei))


def get_attention_status(
    engagement_index: float,
    threshold: float = 0.4
) -> Literal["engaged", "distracted"]:
    """
    Determina el estado de atención basado en el EI.
    Nota: El estado 'asleep' se determina externamente basado en tiempo.
    
    Args:
        engagement_index: Índice de engagement (0.0-1.0)
        threshold: Umbral para considerar distraído (default: 0.4)
        
    Returns:
        "engaged" o "distracted"
    """
    return "engaged" if engagement_index >= threshold else "distracted"


def get_attention_warnings(
    gaze_yaw: float,
    head_yaw: float,
    head_pitch: float,
    avg_ear: float
) -> list[str]:
    """
    Genera advertencias específicas basadas en las métricas.
    
    Args:
        gaze_yaw: Ángulo horizontal de la mirada
        head_yaw: Ángulo horizontal de la cabeza
        head_pitch: Ángulo vertical de la cabeza
        avg_ear: EAR promedio
        
    Returns:
        Lista de advertencias
    """
    warnings = []
    
    gaze_threshold = getattr(settings, 'gaze_yaw_threshold', 20.0)
    yaw_threshold = getattr(settings, 'pose_yaw_threshold', 25.0)
    pitch_threshold = getattr(settings, 'pose_pitch_threshold', 15.0)
    ear_threshold = getattr(settings, 'ear_distraction_threshold', 0.25)
    
    if abs(gaze_yaw) > gaze_threshold:
        warnings.append(f"Desvío lateral de mirada ({gaze_yaw:.1f}°)")
    
    if abs(head_yaw) > yaw_threshold:
        warnings.append(f"Giro de cabeza ({head_yaw:.1f}°)")
    
    if abs(head_pitch) > pitch_threshold:
        direction = "abajo" if head_pitch > 0 else "arriba"
        warnings.append(f"Cabeza inclinada hacia {direction} ({abs(head_pitch):.1f}°)")
    
    if avg_ear < ear_threshold:
        warnings.append("Ojos cerrados o semi-cerrados")
    
    return warnings


def calculate_full_attention_metrics(
    gaze_yaw: float,
    head_yaw: float,
    head_pitch: float,
    left_ear: float,
    right_ear: float,
    blinks_per_minute: float = 13.0  # Default to ideal
) -> AttentionMetrics:
    """
    Calcula todas las métricas de atención en una sola llamada.
    
    Args:
        gaze_yaw: Ángulo horizontal de la mirada
        head_yaw: Ángulo horizontal de la cabeza
        head_pitch: Ángulo vertical de la cabeza
        left_ear: EAR del ojo izquierdo
        right_ear: EAR del ojo derecho
        blinks_per_minute: Tasa de parpadeo (blinks/min)
        
    Returns:
        AttentionMetrics con todos los valores calculados
    """
    # Calcular scores individuales
    gaze_score = calculate_gaze_score(gaze_yaw)
    pose_score = calculate_pose_score(head_yaw, head_pitch)
    blink_score = calculate_blink_score(blinks_per_minute)
    
    # Calcular EAR Score
    _, avg_ear = calculate_ear_status(left_ear, right_ear)
    ear_score = calculate_ear_score(avg_ear)
    
    # Calcular engagement index con penalización de EAR
    ei = calculate_engagement_index_with_ear(gaze_score, pose_score, blink_score, ear_score)
    
    # Determinar estado
    status = get_attention_status(ei)
    
    # Generar advertencias
    warnings = get_attention_warnings(gaze_yaw, head_yaw, head_pitch, avg_ear)
    
    # Advertencia específica de somnolencia
    drowsy_thresh = getattr(settings, 'ear_drowsy_threshold', 0.28)
    closed_thresh = getattr(settings, 'ear_distraction_threshold', 0.22)
    
    if closed_thresh < avg_ear < drowsy_thresh:
        warnings.append("Ojos semi-cerrados (Somnolencia)")
    elif avg_ear <= closed_thresh:
        # Ya cubierto por "Ojos cerrados" en get_attention_warnings, pero aseguramos
        if "Ojos cerrados o semi-cerrados" not in warnings:
             warnings.append("Ojos cerrados")
    
    return AttentionMetrics(
        engagement_index=ei,
        gaze_score=gaze_score,
        pose_score=pose_score,
        blink_score=blink_score,
        status=status,
        warnings=warnings
    )
