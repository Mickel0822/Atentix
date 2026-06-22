"""
Servicio de estimación de mirada usando L2CS-Net.

Este servicio utiliza el modelo L2CS-Net (Appearance-based gaze estimation)
para predecir los ángulos de mirada (Pitch y Yaw) directamente desde
la imagen del rostro.

A diferencia de los métodos geométricos, L2CS-Net puede detectar
el movimiento de los ojos incluso cuando la cabeza permanece estática.
"""
import asyncio
import cv2
import numpy as np
import torch
from torchvision import transforms
from dataclasses import dataclass
from typing import Optional

from services.gaze_model_loader import GazeModelLoader
from services.one_euro_filter import MultiDimensionalOneEuroFilter


@dataclass
class GazeResult:
    """Resultado de la estimación de mirada."""
    pitch: float    # Ángulo vertical (arriba/abajo) en grados
    yaw: float      # Ángulo horizontal (izquierda/derecha) en grados
    success: bool   # Si la estimación fue exitosa


class GazeService:
    """
    Servicio para estimar la dirección de la mirada usando L2CS-Net.
    
    Este servicio:
    1. Recibe una imagen con un rostro detectado
    2. Preprocesa y recorta la región facial
    3. Ejecuta inferencia con L2CS-Net
    4. Aplica filtro 1-Euro para suavizado
    5. Retorna los ángulos de mirada
    """
    
    # Transformaciones para preprocesamiento
    TRANSFORM = transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])
    
    def __init__(
        self, 
        max_concurrent: int = 2,
        use_filter: bool = True,
        device: Optional[str] = None
    ):
        """
        Inicializa el servicio de estimación de mirada.
        
        Args:
            max_concurrent: Máximo de inferencias concurrentes (para evitar OOM)
            use_filter: Si True, aplica filtro 1-Euro para suavizado
            device: Dispositivo ('cuda', 'cpu', o None para auto-detectar)
        """
        self.max_concurrent = max_concurrent
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.device = device
        
        # Cargar modelo (singleton)
        self.model = GazeModelLoader.load_model(device)
        
        # Filtro 1-Euro para suavizado (2 dimensiones: pitch, yaw)
        self.use_filter = use_filter
        if use_filter:
            self.gaze_filter = MultiDimensionalOneEuroFilter(
                dimensions=2,
                freq=15.0,      # 15 FPS esperado
                min_cutoff=1.0, # Suavizado moderado
                beta=0.5        # Respuesta rápida
            )
        
        self._model_loaded = self.model is not None
    
    def is_ready(self) -> bool:
        """Verifica si el servicio está listo para procesar."""
        return self._model_loaded
    
    def preprocess_face(
        self, 
        img: np.ndarray, 
        bbox: Optional[tuple] = None
    ) -> Optional[torch.Tensor]:
        """
        Preprocesa la imagen del rostro para el modelo.
        
        Args:
            img: Imagen BGR de OpenCV
            bbox: Opcional, bounding box del rostro (x, y, w, h)
            
        Returns:
            Tensor preprocesado (1, 3, 224, 224) o None si falla
        """
        try:
            # Recortar rostro si se proporciona bbox
            if bbox is not None:
                x, y, w, h = bbox
                # Usar bbox directamente (el caller ya aplica padding adecuado)
                x1 = max(0, x)
                y1 = max(0, y)
                x2 = min(img.shape[1], x + w)
                y2 = min(img.shape[0], y + h)
                
                face_img = img[y1:y2, x1:x2]
            else:
                face_img = img
            
            # Verificar que la imagen no esté vacía
            if face_img.size == 0 or face_img.shape[0] < 10 or face_img.shape[1] < 10:
                return None
            
            # Convertir BGR a RGB
            face_rgb = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)
            
            # Aplicar transformaciones
            tensor = self.TRANSFORM(face_rgb)
            
            # Agregar dimensión de batch
            tensor = tensor.unsqueeze(0)
            
            return tensor
            
        except Exception as e:
            print(f"[GazeService] Error en preprocesamiento: {e}")
            return None
    
    def extract_face_bbox_from_landmarks(
        self, 
        face_landmarks: any, 
        image_width: int, 
        image_height: int
    ) -> tuple:
        """
        Extrae bounding box del rostro desde landmarks de MediaPipe.
        
        Args:
            face_landmarks: Landmarks de MediaPipe FaceMesh
            image_width: Ancho de la imagen
            image_height: Alto de la imagen
            
        Returns:
            Tuple (x, y, w, h) del bounding box
        """
        # Obtener coordenadas de todos los landmarks
        xs = [lm.x * image_width for lm in face_landmarks.landmark]
        ys = [lm.y * image_height for lm in face_landmarks.landmark]
        
        x1 = int(min(xs))
        y1 = int(min(ys))
        x2 = int(max(xs))
        y2 = int(max(ys))
        
        return (x1, y1, x2 - x1, y2 - y1)
    
    @torch.no_grad()
    def predict_gaze(
        self, 
        img: np.ndarray, 
        bbox: Optional[tuple] = None,
        timestamp: Optional[float] = None
    ) -> GazeResult:
        """
        Predice los ángulos de mirada para una imagen.
        
        Args:
            img: Imagen BGR de OpenCV
            bbox: Opcional, bounding box del rostro (x, y, w, h)
            timestamp: Tiempo actual para el filtro (opcional)
            
        Returns:
            GazeResult con pitch y yaw en grados
        """
        if not self._model_loaded:
            print("[GazeService] ⚠️ Modelo no cargado")
            return GazeResult(pitch=0.0, yaw=0.0, success=False)
        
        try:
            # Preprocesar imagen
            tensor = self.preprocess_face(img, bbox)
            if tensor is None:
                return GazeResult(pitch=0.0, yaw=0.0, success=False)
            
            # Mover a dispositivo
            device = GazeModelLoader.get_device()
            tensor = tensor.to(device)
            
            # Inferencia
            yaw_pred, pitch_pred = self.model(tensor)
            
            # Convertir a float
            yaw = float(yaw_pred.cpu().numpy()[0])
            pitch = float(pitch_pred.cpu().numpy()[0])
            
            # Aplicar filtro si está habilitado
            if self.use_filter:
                filtered = self.gaze_filter.filter([pitch, yaw], timestamp)
                pitch, yaw = filtered
            
            return GazeResult(
                pitch=pitch,
                yaw=yaw,
                success=True
            )
            
        except Exception as e:
            print(f"[GazeService] Error en predicción: {e}")
            return GazeResult(pitch=0.0, yaw=0.0, success=False)
    
    async def predict_gaze_async(
        self, 
        img: np.ndarray, 
        bbox: Optional[tuple] = None,
        timestamp: Optional[float] = None
    ) -> GazeResult:
        """
        Versión asíncrona de predict_gaze con control de concurrencia.
        
        Usa un semáforo para limitar el número de inferencias
        concurrentes y prevenir errores de memoria.
        """
        async with self.semaphore:
            # Ejecutar inferencia en thread pool para no bloquear
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, 
                lambda: self.predict_gaze(img, bbox, timestamp)
            )
            return result
    
    def predict_gaze_from_mediapipe(
        self, 
        img: np.ndarray,
        face_landmarks: any,
        image_width: int,
        image_height: int,
        timestamp: Optional[float] = None
    ) -> GazeResult:
        """
        Predice la mirada usando landmarks de MediaPipe para extraer el bbox.
        
        Args:
            img: Imagen BGR de OpenCV
            face_landmarks: Landmarks de MediaPipe FaceMesh
            image_width: Ancho de la imagen
            image_height: Alto de la imagen
            timestamp: Tiempo actual para el filtro
            
        Returns:
            GazeResult con pitch y yaw en grados
        """
        # Extraer bounding box desde landmarks
        bbox = self.extract_face_bbox_from_landmarks(
            face_landmarks, image_width, image_height
        )
        
        return self.predict_gaze(img, bbox, timestamp)
    
    def reset_filter(self):
        """Reinicia el filtro de suavizado."""
        if self.use_filter:
            self.gaze_filter.reset()
