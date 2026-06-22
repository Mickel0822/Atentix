import cv2
import mediapipe as mp
import numpy as np
import os
from pathlib import Path

from core.config import settings
from models.schemas import BlinkDetectionResponse

# Nuevos imports para Tasks API
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

class BlinkDetectionService:
    """
    Servicio para detectar parpadeos usando MediaPipe Tasks API (FaceLandmarker).
    """
    
    # Índices de landmarks (mismos que antes)
    # Índices de landmarks estándar para MediaPipe Face Mesh (ordenados para fórmula EAR)
    # [Corner1, Top1, Top2, Corner2, Bottom2, Bottom1]
    # EAR = (|Top1-Bottom1| + |Top2-Bottom2|) / (2 * |Corner1-Corner2|)
    LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
    RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]
    
    def __init__(self, static_image_mode: bool = True, max_num_faces: int = 1):
        """
        Inicializa el servicio usando FaceLandmarker.
        """
        # Usar ruta absoluta para evitar problemas de CWD
        current_dir = os.path.dirname(os.path.abspath(__file__))
        models_dir = os.path.join(os.path.dirname(current_dir), "models")
        model_path = os.path.join(models_dir, "face_landmarker.task")
        
        base_options = python.BaseOptions(
            model_asset_path=model_path
        )
        
        # Configurar opciones
        # Usamos IMAGE mode por defecto ya que processed por request
        running_mode = vision.RunningMode.IMAGE
        
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            running_mode=running_mode,
            num_faces=max_num_faces,
            min_face_detection_confidence=settings.face_mesh_min_detection_confidence,
            min_face_presence_confidence=settings.face_mesh_min_tracking_confidence,
            min_tracking_confidence=settings.face_mesh_min_tracking_confidence,
            output_face_blendshapes=True,
            output_facial_transformation_matrixes=True
        )
        
        try:
            self.landmarker = vision.FaceLandmarker.create_from_options(options)
            self.ear_threshold = settings.ear_threshold
            print("[BlinkDetection] ✅ FaceLandmarker inicializado correctamente (Tasks API)")
        except Exception as e:
            print(f"[BlinkDetection] ❌ Error inicializando FaceLandmarker: {e}")
            self.landmarker = None
    
    def detect_blink(self, img: np.ndarray) -> BlinkDetectionResponse:
        """
        Detecta parpadeos en una imagen.
        """
        if self.landmarker is None:
            return BlinkDetectionResponse(blinking=False, left_ear=0.0, right_ear=0.0)

        try:
            # Convertir a mp.Image
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
            
            # Detectar
            detection_result = self.landmarker.detect(mp_image)
            
            # Verificar rostros
            if not detection_result.face_landmarks:
                return BlinkDetectionResponse(
                    blinking=False, left_ear=0.0, right_ear=0.0
                )
            
            # Obtener landmarks del primer rostro (Lista de listas de NormalizedLandmark)
            # detection_result.face_landmarks[0] es la lista de landmarks del primer rostro
            face_landmarks_list = detection_result.face_landmarks[0]
            
            # Calcular EAR
            left_ear = self._calculate_ear_from_landmarks(
                face_landmarks_list, self.LEFT_EYE_INDICES, img.shape
            )
            right_ear = self._calculate_ear_from_landmarks(
                face_landmarks_list, self.RIGHT_EYE_INDICES, img.shape
            )
            
            # Determinar parpadeo
            avg_ear = (left_ear + right_ear) / 2.0
            blinking = avg_ear < self.ear_threshold
            
            return BlinkDetectionResponse(
                blinking=blinking,
                left_ear=left_ear,
                right_ear=right_ear
            )
            
        except Exception as e:
            print(f"[BlinkDetection] ⚠️ Error: {e}")
            return BlinkDetectionResponse(
                blinking=False, left_ear=0.0, right_ear=0.0
            )

    def _calculate_ear_from_landmarks(
        self, 
        face_landmarks_list: list, 
        eye_indices: list, 
        img_shape: tuple
    ) -> float:
        """
        Calcula EAR desde la lista de landmarks.
        Nota: face_landmarks_list es una lista directa de landmarks, no un objeto con .landmark
        """
        h, w = img_shape[:2]
        
        points = []
        for idx in eye_indices:
            # Acceso directo a la lista
            landmark = face_landmarks_list[idx]
            x = landmark.x * w
            y = landmark.y * h
            points.append(np.array([x, y]))
        
        # Cálculo de distancias (igual que antes)
        vertical_dist = np.linalg.norm(points[0] - points[3])
        horizontal_dist_1 = np.linalg.norm(points[1] - points[5])
        horizontal_dist_2 = np.linalg.norm(points[2] - points[4])
        
        if vertical_dist == 0:
            return 0.0
        
        ear = (horizontal_dist_1 + horizontal_dist_2) / (2.0 * vertical_dist)
        return float(ear)
    
    def get_full_result(self, img: np.ndarray):
        """
        Retorna el resultado completo de FaceLandmarker.
        Útil para otros servicios como HeadPose.
        """
        if self.landmarker is None:
            return None
            
        try:
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
            return self.landmarker.detect(mp_image)
        except Exception:
            return None
