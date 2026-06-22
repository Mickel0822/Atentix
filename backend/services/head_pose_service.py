"""
Servicio de estimación de pose de cabeza usando cv2.solvePnP.
Refactorizado para ser compatible con MediaPipe Tasks API.
"""
import cv2
import numpy as np
from dataclasses import dataclass
from typing import Optional, List

# No necesitamos importar mediapipe aquí si solo usamos los datos de landmarks
from services.one_euro_filter import MultiDimensionalOneEuroFilter


@dataclass
class HeadPose:
    """Resultado de la estimación de pose de cabeza."""
    yaw: float      # Rotación horizontal (izquierda/derecha) en grados
    pitch: float    # Rotación vertical (arriba/abajo) en grados
    roll: float     # Inclinación (ladeo) en grados
    success: bool   # Si la estimación fue exitosa
    

class HeadPoseService:
    """
    Servicio para estimar la pose de la cabeza usando SolvePnP.
    Compatible con landmarks de MediaPipe Tasks API.
    """
    
    MODEL_POINTS_3D = np.array([
        (0.0, 0.0, 0.0),          # Punta de la nariz
        (0.0, 330.0, 65.0),       # Mentón (Y positivo = abajo, Z positivo = hacia atrás)
        (-225.0, -170.0, 135.0),  # Esquina ojo izquierdo (Z positivo = hacia atrás)
        (225.0, -170.0, 135.0),   # Esquina ojo derecho
        (-150.0, 150.0, 125.0),   # Esquina boca izquierda
        (150.0, 150.0, 125.0)     # Esquina boca derecha
    ], dtype=np.float64)
    
    MEDIAPIPE_LANDMARK_INDICES = [
        1,    # Punta de la nariz
        152,  # Mentón
        33,   # Esquina exterior ojo izquierdo
        263,  # Esquina exterior ojo derecho
        61,   # Esquina boca izquierda
        291   # Esquina boca derecha
    ]
    
    def __init__(
        self, 
        image_width: int = 640, 
        image_height: int = 480,
        use_filter: bool = True
    ):
        self.image_width = image_width
        self.image_height = image_height
        
        focal_length = image_width
        center = (image_width / 2, image_height / 2)
        
        self.camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1]
        ], dtype=np.float64)
        
        self.dist_coeffs = np.zeros((4, 1), dtype=np.float64)
        
        self.use_filter = use_filter
        if use_filter:
            self.pose_filter = MultiDimensionalOneEuroFilter(
                dimensions=3,
                freq=15.0,
                min_cutoff=0.8,
                beta=0.5
            )
    
    def update_camera_params(self, image_width: int, image_height: int):
        if image_width != self.image_width or image_height != self.image_height:
            self.image_width = image_width
            self.image_height = image_height
            
            focal_length = image_width
            center = (image_width / 2, image_height / 2)
            
            self.camera_matrix = np.array([
                [focal_length, 0, center[0]],
                [0, focal_length, center[1]],
                [0, 0, 1]
            ], dtype=np.float64)
    
    def extract_landmarks_2d(
        self, 
        face_landmarks: list,  # Lista de objetos landmark (New API) o legacy object
        image_width: int, 
        image_height: int
    ) -> np.ndarray:
        """
        Extrae los puntos 2D de los landmarks de MediaPipe.
        Soporta tanto la lista directa (Tasks API) como objeto legacy (Solutions).
        """
        points_2d = []
        
        # Verificar si es legacy (tiene atributo .landmark)
        if hasattr(face_landmarks, 'landmark'):
            landmarks_source = face_landmarks.landmark
        else:
            # Asumimos que es una lista directa (Tasks API)
            landmarks_source = face_landmarks
        
        for idx in self.MEDIAPIPE_LANDMARK_INDICES:
            landmark = landmarks_source[idx]
            x = landmark.x * image_width
            y = landmark.y * image_height
            points_2d.append([x, y])
        
        return np.array(points_2d, dtype=np.float64)
    
    def _rotation_matrix_to_euler(self, rotation_matrix: np.ndarray) -> tuple:
        """
        Calcula ángulos de Euler (Yaw, Pitch, Roll) desde la matriz de rotación.
        Retorna: (yaw, pitch, roll) en grados.
        """
        # Calcular ángulos de Euler (convención XYZ o ZYX depende de solvePnP)
        # OpenCV solvePnP usa un sistema de coordenadas donde Z es hacia adelante
        
        # Sy = sqrt(R00^2 + R10^2)
        sy = np.sqrt(rotation_matrix[0, 0] ** 2 + rotation_matrix[1, 0] ** 2)
        
        singular = sy < 1e-6
        
        if not singular:
            x = np.arctan2(rotation_matrix[2, 1], rotation_matrix[2, 2])
            y = np.arctan2(-rotation_matrix[2, 0], sy)
            z = np.arctan2(rotation_matrix[1, 0], rotation_matrix[0, 0])
        else:
            x = np.arctan2(-rotation_matrix[1, 2], rotation_matrix[1, 1])
            y = np.arctan2(-rotation_matrix[2, 0], sy)
            z = 0
            
        # Convertir a grados
        rx = np.degrees(x)
        ry = np.degrees(y)
        rz = np.degrees(z)
        
        # Pitch = x (rotación sobre eje X)
        # Yaw = y (rotación sobre eje Y)
        # Roll = z (rotación sobre eje Z)
        
        # Ajustar rangos si es necesario
        # Pitch positivo = arriba, negativo = abajo
        # Yaw positivo = derecha, negativo = izquierda (o viceversa según cámara)
        
        return ry, rx, rz  # Orden: Yaw, Pitch, Roll
    
    def estimate_pose(
        self, 
        landmarks_2d: np.ndarray,
        timestamp: Optional[float] = None
    ) -> HeadPose:
        try:
            success, rotation_vector, translation_vector = cv2.solvePnP(
                self.MODEL_POINTS_3D,
                landmarks_2d,
                self.camera_matrix,
                self.dist_coeffs,
                flags=cv2.SOLVEPNP_ITERATIVE
            )
            
            if not success:
                return HeadPose(yaw=0.0, pitch=0.0, roll=0.0, success=False)
            
            rotation_matrix, _ = cv2.Rodrigues(rotation_vector)
            yaw, pitch, roll = self._rotation_matrix_to_euler(rotation_matrix)
            
            if self.use_filter:
                filtered = self.pose_filter.filter([yaw, pitch, roll], timestamp)
                yaw, pitch, roll = filtered
            
            return HeadPose(
                yaw=float(yaw),
                pitch=float(pitch),
                roll=float(roll),
                success=True
            )
        except Exception as e:
            print(f"[HeadPoseService] Error en estimación de pose: {e}")
            return HeadPose(yaw=0.0, pitch=0.0, roll=0.0, success=False)
    
    def estimate_pose_from_mediapipe(
        self, 
        face_landmarks: any,
        image_width: int,
        image_height: int,
        timestamp: Optional[float] = None
    ) -> HeadPose:
        self.update_camera_params(image_width, image_height)
        landmarks_2d = self.extract_landmarks_2d(face_landmarks, image_width, image_height)
        return self.estimate_pose(landmarks_2d, timestamp)
    
    def get_nose_direction_2d(
        self, 
        face_landmarks: any,
        image_width: int,
        image_height: int,
        length: float = 100.0
    ) -> tuple:
        # Manejo híbrido (tasks api vs legacy)
        if hasattr(face_landmarks, 'landmark'):
            nose = face_landmarks.landmark[1]
        else:
            nose = face_landmarks[1]
            
        nose_point = (int(nose.x * image_width), int(nose.y * image_height))
        landmarks_2d = self.extract_landmarks_2d(face_landmarks, image_width, image_height)
        
        try:
            success, rvec, tvec = cv2.solvePnP(
                self.MODEL_POINTS_3D,
                landmarks_2d,
                self.camera_matrix,
                self.dist_coeffs,
                flags=cv2.SOLVEPNP_ITERATIVE
            )
            
            if not success:
                return nose_point, None
            
            axis_3d = np.array([
                [length, 0, 0], [0, length, 0], [0, 0, length]
            ], dtype=np.float64)
            
            axis_2d, _ = cv2.projectPoints(
                axis_3d, rvec, tvec, self.camera_matrix, self.dist_coeffs
            )
            
            axis_points = [
                (int(axis_2d[0][0][0]), int(axis_2d[0][0][1])),
                (int(axis_2d[1][0][0]), int(axis_2d[1][0][1])),
                (int(axis_2d[2][0][0]), int(axis_2d[2][0][1]))
            ]
            
            return nose_point, axis_points
        except Exception:
            return nose_point, None
            
    def reset_filter(self):
        if self.use_filter:
            self.pose_filter.reset()
