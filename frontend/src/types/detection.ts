/**
 * Coordenadas de la detección de rostro
 */
export interface Coordinates {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Respuesta del endpoint de detección de rostros
 */
export interface FaceDetectionResponse {
  detected: boolean;
  coordinates: Coordinates | null;
  confidence: number;
}

/**
 * Request body para el endpoint de detección
 */
export interface FaceDetectionRequest {
  image: string; // Imagen en Base64
}

/**
 * Respuesta del endpoint de detección de parpadeos
 */
export interface BlinkDetectionResponse {
  blinking: boolean;
  left_ear: number;
  right_ear: number;
}

/**
 * Request body para el endpoint de detección de parpadeos
 */
export interface BlinkDetectionRequest {
  image: string; // Imagen en Base64
}

/**
 * Respuesta del endpoint de contador de parpadeos
 */
export interface BlinkCountResponse {
  blink_count: number;
}

/**
 * Respuesta combinada que incluye detección de rostro y parpadeo
 */
export interface CombinedDetectionResponse {
  faceDetected: boolean;
  blinking: boolean;
  left_ear: number;
  right_ear: number;
  faceConfidence?: number;
  faceCoordinates?: Coordinates | null;
}

// ============================================
// Tipos para Monitoreo de Atención (Nuevo)
// ============================================

/**
 * Datos de dirección de mirada (Gaze)
 */
export interface GazeData {
  pitch: number;  // Ángulo vertical (arriba/abajo) en grados
  yaw: number;    // Ángulo horizontal (izquierda/derecha) en grados
}

/**
 * Datos de pose de cabeza (Head Pose)
 */
export interface PoseData {
  yaw: number;    // Rotación horizontal en grados
  pitch: number;  // Rotación vertical en grados
  roll: number;   // Inclinación en grados
}

/**
 * Datos de EAR (Eye Aspect Ratio) para cada ojo
 */
export interface EarData {
  left: number;
  right: number;
}

/**
 * Respuesta del WebSocket de monitoreo de atención
 */
export interface AttentionResponse {
  attention_score: number;           // Índice de engagement (0-1)
  gaze: GazeData;                    // Dirección de mirada
  pose: PoseData;                    // Pose de cabeza
  blink: boolean;                    // Si está parpadeando
  ear: EarData;                      // EAR de cada ojo
  status: "engaged" | "distracted" | "asleep" | "unknown";  // Estado de atención
  warnings: string[];                // Advertencias específicas
  blinks_per_minute?: number;        // Tasa de parpadeo
  face_detected: boolean;            // Si se detectó rostro
  error?: string;                    // Mensaje de error si aplica
}

/**
 * Datos de calibración de mirada
 */
export interface CalibrationData {
  centerGaze: GazeData;
  timestamp: number;
  points: CalibrationPoint[];
}

/**
 * Punto individual de calibración
 */
export interface CalibrationPoint {
  screenX: number;
  screenY: number;
  gazeYaw: number;
  gazePitch: number;
}

/**
 * Estado del monitoreo de atención
 */
export interface AttentionState {
  isConnected: boolean;
  isCalibrated: boolean;
  currentScore: number;
  status: "engaged" | "distracted" | "asleep" | "unknown";
  lastUpdate: number;
  alertActive: boolean;
}