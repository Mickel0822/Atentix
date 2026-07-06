"""
WebSocket para monitoreo de atención en tiempo real.
Refactorizado para usar MediaPipe Tasks API.
"""
import asyncio
import json
import time
from typing import Optional
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.routing import APIRouter

from core.config import settings
from endpoints.websockets.connection_manager import ConnectionManager
from services.attention_trackers import BlinkRateTracker, DrowsinessTracker
from services.blink_detection_service import BlinkDetectionService
from services.gaze_service import GazeService
from services.head_pose_service import HeadPoseService
from services.attention_logic import (
    calculate_full_attention_metrics, 
    calculate_ear_status
)
from utils.image_utils import base64_to_opencv

router = APIRouter()

# Instancia del gestor de conexiones
manager = ConnectionManager()

# Servicios inicializados de forma lazy
_gaze_service: Optional[GazeService] = None
_head_pose_service: Optional[HeadPoseService] = None
_blink_service: Optional[BlinkDetectionService] = None

def get_services():
    """Inicializa todos los servicios cuando se necesitan."""
    global _gaze_service, _head_pose_service, _blink_service
    
    if _gaze_service is None:
        print("[AttentionMonitor] Inicializando servicios (Tasks API)...")
        _gaze_service = GazeService(
            max_concurrent=2,
            use_filter=True
        )
        _head_pose_service = HeadPoseService(
            use_filter=True
        )
        # BlinkDetectionService ahora encapsula FaceLandmarker
        _blink_service = BlinkDetectionService(
            static_image_mode=True, # IMAGE mode en Tasks API
            max_num_faces=1
        )
        print("[AttentionMonitor] ✅ Servicios inicializados")
    
    return _gaze_service, _head_pose_service, _blink_service


@router.websocket("/ws/monitor")
async def websocket_attention_monitor(websocket: WebSocket):
    await manager.connect(websocket)
    
    blink_tracker = BlinkRateTracker(window_seconds=60.0)
    drowsiness_tracker = DrowsinessTracker(threshold_seconds=2.0)  # 2 segundos umbral
    
    # Estado de calibración (Offset)
    calibration_offset = {"yaw": 0.0, "pitch": 0.0}
    
    gaze_service, head_pose_service, blink_service = get_services()
    
    gaze_available = gaze_service.is_ready()
    if not gaze_available:
        print("[AttentionMonitor] ⚠️ Modelo L2CS-Net no disponible, usando solo head pose")
    
    try:
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Manejo de mensajes de control (Calibración)
                if "type" in message and message["type"] == "calibration":
                    offset = message.get("offset", {})
                    calibration_offset["yaw"] = float(offset.get("yaw", 0.0))
                    calibration_offset["pitch"] = float(offset.get("pitch", 0.0))
                    print(f"[AttentionMonitor] 🎯 Calibración recibida: {calibration_offset}")
                    continue
                
                if "image" not in message:
                    await manager.send_json_message({"error": "Falta 'image'"}, websocket)
                    continue
                
                timestamp = time.time()
                
                try:
                    img = base64_to_opencv(message["image"])
                    img_height, img_width = img.shape[:2]
                except Exception as e:
                    await manager.send_json_message({"error": f"Error img: {str(e)}"}, websocket)
                    continue
                
                # --- NUEVA LÓGICA USANDO BlinkDetectionService COMO MAESTRO ---
                # Obtener resultado completo de FaceLandmarker
                landmarker_result = blink_service.get_full_result(img)
                
                if not landmarker_result or not landmarker_result.face_landmarks:
                    # No rostros: Resetear trackers
                    drowsiness_tracker.reset()
                    
                    await manager.send_json_message({
                        "attention_score": 0.0,
                        "gaze": {"pitch": 0.0, "yaw": 0.0},
                        "pose": {"yaw": 0.0, "pitch": 0.0, "roll": 0.0},
                        "blink": False,
                        "ear": {"left": 0.0, "right": 0.0},
                        "status": "distracted",
                        "warnings": ["No se detectó rostro"],
                        "face_detected": False,
                        "is_calibrated": (calibration_offset["yaw"] != 0 or calibration_offset["pitch"] != 0)
                    }, websocket)
                    continue
                
                # Extraer landmarks del primer rostro
                face_landmarks = landmarker_result.face_landmarks[0]
                
                # 1. Head Pose (pasamos la lista de landmarks)
                head_pose = head_pose_service.estimate_pose_from_mediapipe(
                    face_landmarks, img_width, img_height, timestamp
                )
                
                # 2. Gaze (L2CS-Net)
                if gaze_available:
                    # Calc BBox from landmarks (min/max)
                    xs = [l.x * img_width for l in face_landmarks]
                    ys = [l.y * img_height for l in face_landmarks]
                    x_min, x_max = min(xs), max(xs)
                    y_min, y_max = min(ys), max(ys)
                    
                    # Convert to Square BBox + Padding
                    # L2CS-Net needs face + some context. 1.5x provides good balance.
                    # GazeService no longer adds internal margin.
                    w_box = x_max - x_min
                    h_box = y_max - y_min
                    size = max(w_box, h_box) * 1.5
                    
                    center_x = x_min + w_box / 2
                    center_y = y_min + h_box / 2
                    
                    x1 = int(center_x - size / 2)
                    y1 = int(center_y - size / 2)
                    w = int(size)
                    h = int(size)
                    
                    # Ensure within bounds
                    x1 = max(0, x1)
                    y1 = max(0, y1)
                    w = min(w, img_width - x1)
                    h = min(h, img_height - y1)
                    
                    bbox = (x1, y1, w, h)
                    
                    gaze_result = gaze_service.predict_gaze(img, bbox, timestamp)
                    
                    raw_yaw = gaze_result.yaw if gaze_result and gaze_result.success else 0.0
                    raw_pitch = gaze_result.pitch if gaze_result and gaze_result.success else 0.0
                    
                    # Aplicar calibración
                    gaze_yaw = raw_yaw - calibration_offset["yaw"]
                    gaze_pitch = raw_pitch - calibration_offset["pitch"]
                    
                else:
                    gaze_yaw = head_pose.yaw * 0.5
                    gaze_pitch = head_pose.pitch * 0.5
                
                # 3. Blink Detection / Eyes Status
                left_indices = BlinkDetectionService.LEFT_EYE_INDICES
                right_indices = BlinkDetectionService.RIGHT_EYE_INDICES
                
                left_ear = blink_service._calculate_ear_from_landmarks(face_landmarks, left_indices, img.shape)
                right_ear = blink_service._calculate_ear_from_landmarks(face_landmarks, right_indices, img.shape)
                avg_ear = (left_ear + right_ear) / 2.0
                
                # "Ojos cerrados" umbral (solo cuando están realmente cerrados)
                threshold = getattr(settings, 'ear_distraction_threshold', 0.13)
                eyes_closed = avg_ear < threshold
                
                # 4. Tasa de Parpadeo
                blinks_per_minute = blink_tracker.update(eyes_closed, timestamp)
                
                # 5. Drowsiness / Sleep Detection
                is_asleep = drowsiness_tracker.update(eyes_closed, timestamp)
                
                # 6. Métricas
                metrics = calculate_full_attention_metrics(
                    gaze_yaw, head_pose.yaw, head_pose.pitch, 
                    left_ear, right_ear, blinks_per_minute
                )
                
                # Override status if asleep
                final_status = metrics.status
                final_score = metrics.engagement_index
                
                if is_asleep:
                    final_status = "asleep"
                    final_score = 0.0  # Force critical score
                    # Asegurar alerta
                    if "¡DORMIDO DETECTADO!" not in metrics.warnings:
                        metrics.warnings.insert(0, "¡DORMIDO DETECTADO!")
                
                response = {
                    "attention_score": round(final_score, 3),
                    "gaze": {"pitch": round(gaze_pitch, 2), "yaw": round(gaze_yaw, 2)},
                    "pose": {"yaw": round(head_pose.yaw, 2), "pitch": round(head_pose.pitch, 2), "roll": round(head_pose.roll, 2)},
                    "blink": eyes_closed,
                    "ear": {"left": round(left_ear, 3), "right": round(right_ear, 3)},
                    "status": final_status,
                    "warnings": metrics.warnings,
                    "blinks_per_minute": round(blinks_per_minute, 1),
                    "face_detected": True
                }
                
                await manager.send_json_message(response, websocket)
                
            except json.JSONDecodeError:
                await manager.send_json_message({"error": "JSON inválido"}, websocket)
            except WebSocketDisconnect:
                break
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[AttentionMonitor] Error: {e}")
    finally:
        manager.disconnect(websocket)
        gaze_service.reset_filter() if gaze_service else None
        head_pose_service.reset_filter() if head_pose_service else None


@router.get("/monitor/status")
async def get_monitor_status():
    gaze_service, _, _ = get_services()
    return {
        "status": "ready",
        "services": {
            "gaze": "L2CS-Net",
            "vision": "MediaPipe Tasks (FaceLandmarker)"
        }
    }
