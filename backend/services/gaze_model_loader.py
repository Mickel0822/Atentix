"""
Cargador del modelo L2CS-Net para estimación de mirada.

Este módulo maneja la carga y caché del modelo L2CS-Net pre-entrenado.
L2CS-Net es una CNN (backbone ResNet50) que predice los ángulos
Pitch y Yaw de la mirada directamente desde la imagen.

El modelo usa un enfoque de "Appearance-based gaze estimation"
que no requiere calibración del usuario.

IMPORTANTE: La arquitectura debe coincidir EXACTAMENTE con el checkpoint
descargado (L2CSNet_gaze360.pkl). Las claves del state_dict son:
  - Backbone: conv1, bn1, layer1..layer4 (ResNet50 estándar, sin prefijo)
  - FC heads: fc_yaw_gaze, fc_pitch_gaze (no fc_yaw/fc_pitch)
  - Ángulos Gaze360: 90 bins, rango [-180, 176] grados (fórmula: idx * 4 - 180)
"""
import os
import torch
import torch.nn as nn
from torchvision.models.resnet import Bottleneck
from typing import Optional
import urllib.request
from pathlib import Path


class L2CSNet(nn.Module):
    """
    Implementación de L2CS-Net para estimación de mirada.
    
    Arquitectura que coincide EXACTAMENTE con el checkpoint Gaze360:
    - Backbone: ResNet50 con Bottleneck blocks (capas expuestas al top-level)
    - Cabeza: fc_yaw_gaze y fc_pitch_gaze (90 bins cada una)
    - Conversión: idx * 4 - 180 grados (rango completo Gaze360)
    """
    
    def __init__(self, num_bins: int = 90):
        super(L2CSNet, self).__init__()
        self.num_bins = num_bins
        self.inplanes = 64
        
        # ---- Backbone ResNet50 (capas al top-level para coincidir con checkpoint) ----
        self.conv1 = nn.Conv2d(3, 64, kernel_size=7, stride=2, padding=3, bias=False)
        self.bn1 = nn.BatchNorm2d(64)
        self.relu = nn.ReLU(inplace=True)
        self.maxpool = nn.MaxPool2d(kernel_size=3, stride=2, padding=1)
        
        # ResNet50 layers: [3, 4, 6, 3] Bottleneck blocks
        self.layer1 = self._make_layer(Bottleneck, 64, 3)
        self.layer2 = self._make_layer(Bottleneck, 128, 4, stride=2)
        self.layer3 = self._make_layer(Bottleneck, 256, 6, stride=2)
        self.layer4 = self._make_layer(Bottleneck, 512, 3, stride=2)
        
        self.avgpool = nn.AdaptiveAvgPool2d((1, 1))
        
        # ---- Cabezas de clasificación (nombres que coinciden con checkpoint) ----
        self.fc_yaw_gaze = nn.Linear(512 * Bottleneck.expansion, num_bins)  # 2048 -> 90
        self.fc_pitch_gaze = nn.Linear(512 * Bottleneck.expansion, num_bins)  # 2048 -> 90
        
        # Índices para expected value
        self.idx_tensor = torch.arange(num_bins, dtype=torch.float32)
    
    def _make_layer(self, block, planes, blocks, stride=1):
        """Construye una capa ResNet con Bottleneck blocks."""
        downsample = None
        if stride != 1 or self.inplanes != planes * block.expansion:
            downsample = nn.Sequential(
                nn.Conv2d(self.inplanes, planes * block.expansion,
                          kernel_size=1, stride=stride, bias=False),
                nn.BatchNorm2d(planes * block.expansion),
            )
        
        layers = []
        layers.append(block(self.inplanes, planes, stride, downsample))
        self.inplanes = planes * block.expansion
        for _ in range(1, blocks):
            layers.append(block(self.inplanes, planes))
        
        return nn.Sequential(*layers)
    
    def forward(self, x: torch.Tensor) -> tuple:
        """
        Forward pass.
        
        Args:
            x: Tensor de imagen (B, 3, 224, 224)
            
        Returns:
            Tuple (yaw_predicted, pitch_predicted) en grados
        """
        # Backbone
        x = self.conv1(x)
        x = self.bn1(x)
        x = self.relu(x)
        x = self.maxpool(x)
        
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)
        
        x = self.avgpool(x)
        x = x.view(x.size(0), -1)  # Flatten: (B, 2048)
        
        # Predicción de clasificación (90 bins)
        yaw_logits = self.fc_yaw_gaze(x)
        pitch_logits = self.fc_pitch_gaze(x)
        
        # Softmax
        yaw_softmax = torch.softmax(yaw_logits, dim=1)
        pitch_softmax = torch.softmax(pitch_logits, dim=1)
        
        # Mover idx_tensor al mismo dispositivo
        idx_tensor = self.idx_tensor.to(x.device)
        
        # Calcular ángulos esperados (regresión suave)
        # Gaze360 usa: idx * 4 - 180 (rango -180° a +176°)
        yaw_predicted = torch.sum(yaw_softmax * idx_tensor, dim=1) * 4.0 - 180.0
        pitch_predicted = torch.sum(pitch_softmax * idx_tensor, dim=1) * 4.0 - 180.0
        
        return yaw_predicted, pitch_predicted


class GazeModelLoader:
    """
    Singleton para cargar y cachear el modelo L2CS-Net.
    """
    
    _instance: Optional['GazeModelLoader'] = None
    _model: Optional[L2CSNet] = None
    _device: Optional[torch.device] = None
    
    # URL de descarga del modelo
    MODEL_URL = "https://github.com/Ahmednull/L2CS-Net/releases/download/v1.0/L2CSNet_gaze360.pkl"
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        pass
    
    @classmethod
    def get_model_path(cls) -> Path:
        """Retorna la ruta donde se guarda el modelo."""
        backend_dir = Path(__file__).parent.parent
        models_dir = backend_dir / "models"
        models_dir.mkdir(exist_ok=True)
        return models_dir / "L2CSNet_gaze360.pkl"
    
    @classmethod
    def download_model(cls, force: bool = False) -> bool:
        """
        Descarga el modelo si no existe.
        """
        model_path = cls.get_model_path()
        
        if model_path.exists() and not force:
            print(f"[GazeModelLoader] Modelo ya existe en {model_path}")
            return True
        
        print(f"[GazeModelLoader] Descargando modelo desde {cls.MODEL_URL}...")
        
        try:
            model_path.parent.mkdir(parents=True, exist_ok=True)
            urllib.request.urlretrieve(cls.MODEL_URL, str(model_path))
            print(f"[GazeModelLoader] ✅ Modelo descargado en {model_path}")
            return True
        except Exception as e:
            print(f"[GazeModelLoader] ❌ Error descargando modelo: {e}")
            print("[GazeModelLoader] Por favor descarga manualmente L2CSNet_gaze360.pkl")
            return False
    
    @classmethod
    def load_model(cls, device: Optional[str] = None) -> Optional[L2CSNet]:
        """
        Carga el modelo L2CS-Net.
        """
        # Retornar modelo cacheado si ya está cargado
        if cls._model is not None:
            return cls._model
        
        # Determinar dispositivo
        if device is None:
            device = 'cuda' if torch.cuda.is_available() else 'cpu'
        cls._device = torch.device(device)
        
        print(f"[GazeModelLoader] Usando dispositivo: {cls._device}")
        
        model_path = cls.get_model_path()
        
        # Verificar si existe el modelo
        if not model_path.exists():
            print(f"[GazeModelLoader] ⚠️ Modelo no encontrado en {model_path}")
            if not cls.download_model():
                return None
        
        try:
            # Crear modelo con arquitectura correcta
            model = L2CSNet(num_bins=90)
            
            # Cargar pesos
            print(f"[GazeModelLoader] Cargando pesos desde {model_path}...")
            
            # Cargar checkpoint (OrderedDict directo)
            state_dict = torch.load(str(model_path), map_location=cls._device)
            
            # Si es un dict con 'state_dict' key, extraerlo
            if isinstance(state_dict, dict) and 'state_dict' in state_dict:
                state_dict = state_dict['state_dict']
            elif isinstance(state_dict, dict) and 'model_state_dict' in state_dict:
                state_dict = state_dict['model_state_dict']
            
            # Remover prefijo 'module.' si existe (de DataParallel)
            new_state_dict = {}
            for k, v in state_dict.items():
                name = k.replace('module.', '')
                new_state_dict[name] = v
            
            # Cargar con strict=True para detectar errores reales
            # Ignorar solo fc_finetune que no usamos
            model_keys = set(model.state_dict().keys())
            ckpt_keys = set(new_state_dict.keys())
            
            # Filtrar claves que no están en nuestro modelo (como fc_finetune)
            filtered_state_dict = {k: v for k, v in new_state_dict.items() if k in model_keys}
            
            missing = model_keys - set(filtered_state_dict.keys())
            unexpected = ckpt_keys - model_keys
            
            if missing:
                # Solo idx_tensor debería faltar (buffer, no parámetro)
                real_missing = [k for k in missing if 'idx_tensor' not in k and 'num_batches_tracked' not in k]
                if real_missing:
                    print(f"[GazeModelLoader] ⚠️ Claves faltantes: {real_missing}")
            
            if unexpected:
                print(f"[GazeModelLoader] ℹ️ Claves ignoradas del checkpoint: {unexpected}")
            
            model.load_state_dict(filtered_state_dict, strict=False)
            model.to(cls._device)
            model.eval()
            
            # Verificación: contar parámetros cargados
            loaded_count = len(filtered_state_dict)
            total_count = len(model_keys)
            print(f"[GazeModelLoader] ✅ Modelo cargado: {loaded_count}/{total_count} pesos cargados")
            
            cls._model = model
            return model
            
        except Exception as e:
            print(f"[GazeModelLoader] ❌ Error cargando modelo: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    @classmethod
    def get_device(cls) -> torch.device:
        """Retorna el dispositivo actual."""
        if cls._device is None:
            cls._device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        return cls._device
    
    @classmethod
    def is_loaded(cls) -> bool:
        """Verifica si el modelo está cargado."""
        return cls._model is not None
    
    @classmethod
    def unload(cls):
        """Descarga el modelo de memoria."""
        if cls._model is not None:
            del cls._model
            cls._model = None
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            print("[GazeModelLoader] Modelo descargado de memoria")
