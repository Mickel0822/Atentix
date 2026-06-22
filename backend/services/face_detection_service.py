import cv2
import mediapipe as mp
import numpy as np
import os
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

from models.schemas import Coordinates, FaceDetectionResponse
from core.config import settings

class FaceDetectionService:
    """
    Servicio de detección de rostros usando MediaPipe Tasks API (FaceDetector).
    """
    def __init__(self, model_selection: int = 0, min_detection_confidence: float = 0.5):
        # Nota: model_selection era para BlazeFace legacy (short/full).
        # En Tasks API, usamos un modelo único (normalmente short range por defecto).
        
        # Usar ruta absoluta para evitar problemas de CWD
        current_dir = os.path.dirname(os.path.abspath(__file__))
        models_dir = os.path.join(os.path.dirname(current_dir), "models")
        model_path = os.path.join(models_dir, "face_detector.task")

        base_options = python.BaseOptions(
            model_asset_path=model_path
        )
        options = vision.FaceDetectorOptions(
            base_options=base_options,
            min_detection_confidence=min_detection_confidence
        )
        
        try:
            self.detector = vision.FaceDetector.create_from_options(options)
            print("[FaceDetection] ✅ FaceDetector inicializado (Tasks API)")
        except Exception as e:
            print(f"[FaceDetection] ⚠️ Error inicializando: {e} (Usando fallback?)")
            self.detector = None

    def detect_face(self, img: np.ndarray) -> FaceDetectionResponse:
        if self.detector is None:
            return FaceDetectionResponse(detected=False, coordinates=None, confidence=0.0)

        try:
            # Convertir a mp.Image
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
            
            # Detectar
            result = self.detector.detect(mp_image)
            
            if not result.detections:
                print("[FaceDetection] ❌ No se detectó rostro")
                return FaceDetectionResponse(detected=False, coordinates=None, confidence=0.0)
            
            # Primer rostro
            detection = result.detections[0]
            confidence = detection.categories[0].score
            bbox = detection.bounding_box
            
            # Tasks API BBox tiene origin_x, origin_y, width, height
            x = bbox.origin_x
            y = bbox.origin_y
            w = bbox.width
            h = bbox.height
            
            print(f"[FaceDetection] ✅ Rostro detectado: {confidence:.2f}")
            
            return FaceDetectionResponse(
                detected=True,
                coordinates=Coordinates(x=x, y=y, w=w, h=h),
                confidence=float(confidence)
            )
            
        except Exception as e:
            print(f"[FaceDetection] ⚠️ Error: {e}")
            return FaceDetectionResponse(detected=False, coordinates=None, confidence=0.0)
