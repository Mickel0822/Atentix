try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    PYDANTIC_V2 = True
except ImportError:
    # Compatibilidad con versiones antiguas de Pydantic
    from pydantic import BaseSettings
    PYDANTIC_V2 = False


class Settings(BaseSettings):
    """
    Configuración de la aplicación usando Pydantic Settings.
    Las variables pueden ser definidas en un archivo .env o como variables de entorno.
    """
    
    # Configuración de la API
    api_title: str = "API de Detección de Atención"
    api_version: str = "1.0.0"
    
    # Configuración de MediaPipe
    face_detection_model_selection: int = 0  # 0 para modelo corto, 1 para modelo completo
    face_detection_min_confidence: float = 0.5  # Modificado a 0.5 para pruebas (antes 0.8)
    
    # Configuración de Face Mesh (para detección de parpadeos con FaceLandmarker)
    face_mesh_min_detection_confidence: float = 0.5  # Modificado a 0.5 para pruebas (antes 0.7)
    face_mesh_min_tracking_confidence: float = 0.5  # Modificado a 0.5 para pruebas (antes 0.7)
    
    # Configuración de detección de parpadeo
    # Configuración de detección de parpadeo
    ear_threshold: float = 0.20  # Umbral EAR estándar
    ear_distraction_threshold: float = 0.13  # Detecta ojos CERRADOS (< 0.13)
    ear_drowsy_threshold: float = 0.18  # Detecta ojos SEMI-CERRADOS (0.13 - 0.18)
    
    # Configuración de monitoreo de atención
    gaze_yaw_threshold: float = 20.0  # Umbral en grados para detectar desvío lateral de mirada
    pose_yaw_threshold: float = 25.0  # Umbral en grados para detectar giro de cabeza
    pose_pitch_threshold: float = 15.0  # Umbral en grados para detectar inclinación de cabeza
    ideal_blink_rate_min: int = 12  # Mínimo ideal de parpadeos por minuto
    ideal_blink_rate_max: int = 15  # Máximo ideal de parpadeos por minuto
    l2cs_model_path: str = "models/L2CSNet_gaze360.pkl"  # Ruta al modelo L2CS-Net
    
    # Pesos para el Engagement Index (EI = wg*Gaze + wp*Pose + wb*Blink)
    engagement_weight_gaze: float = 0.5
    engagement_weight_pose: float = 0.3
    engagement_weight_blink: float = 0.2
    
    @property
    def engagement_weights(self) -> dict:
        return {
            "gaze": self.engagement_weight_gaze,
            "pose": self.engagement_weight_pose,
            "blink": self.engagement_weight_blink
        }
    
    # Configuración de WebSocket
    websocket_check_interval: float = 0.5  # Intervalo en segundos para verificar cambios en WebSocket (blink_count)
    
    # Configuración de Supabase
    supabase_url: str
    supabase_key: str
    supabase_service_role_key: str = ""

    # Configuración de IA (Gemini)
    gemini_api_key: str = ""
    
    if PYDANTIC_V2:
        model_config = SettingsConfigDict(
            env_file=".env",
            case_sensitive=False,
            extra="ignore"  # Ignorar variables de entorno no definidas
        )
    else:
        class Config:
            env_file = ".env"
            case_sensitive = False
            extra = "ignore"  # Ignorar variables de entorno no definidas


# Instancia global de configuración
settings = Settings()
