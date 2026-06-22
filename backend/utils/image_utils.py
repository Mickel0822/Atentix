import base64
import re

import cv2
import numpy as np


def base64_to_opencv(image_base64: str) -> np.ndarray:
    """
    Convierte una imagen en Base64 a un array de OpenCV (numpy).
    Maneja el caso donde el Base64 viene con prefijo data:image/...;base64,
    """
    # Remover el prefijo si existe
    image_base64 = re.sub(r"^data:image/[^;]+;base64,", "", image_base64)

    # Decodificar Base64
    image_bytes = base64.b64decode(image_base64)

    # Convertir a array numpy
    nparr = np.frombuffer(image_bytes, np.uint8)

    # Decodificar imagen
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    return img

