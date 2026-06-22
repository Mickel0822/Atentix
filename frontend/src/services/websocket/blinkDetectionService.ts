import { createWebSocketService } from "./config/createWebSocketService";
import { buildWebSocketUrl } from "./config/config";
import type {
  BlinkDetectionResponse,
  BlinkDetectionRequest,
} from "@/types/detection";
import type { WebSocketService } from "./config/types";

/**
 * Endpoint específico para la detección de parpadeos
 */
const BLINK_DETECTION_ENDPOINT = "/ws/detect/blink";

/**
 * URL completa para el WebSocket de detección de parpadeos
 */
export const BLINK_DETECTION_WS_URL = buildWebSocketUrl(
  BLINK_DETECTION_ENDPOINT
);

/**
 * Callbacks específicos para el WebSocket de detección de parpadeos
 */
export interface BlinkDetectionCallbacks {
  onBlinkDetection?: (response: BlinkDetectionResponse) => void;
  onOpen?: () => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  onReconnect?: (attempt: number) => void;
  onReconnectFailed?: () => void;
}

/**
 * Interfaz extendida del servicio WebSocket para incluir método de envío de imágenes
 */
export interface BlinkDetectionWebSocketService extends WebSocketService {
  /**
   * Envía una imagen en Base64 para detectar parpadeos
   * @param image - Imagen codificada en Base64
   */
  sendImage: (image: string) => void;
}

/**
 * Crea una instancia del servicio WebSocket para detectar parpadeos en tiempo real.
 * El cliente puede enviar imágenes en Base64 y recibir respuestas de detección.
 *
 * @param callbacks - Callbacks para manejar eventos del WebSocket
 * @returns Instancia del servicio WebSocket configurado para la detección de parpadeos
 */
export function createBlinkDetectionWebSocket(
  callbacks: BlinkDetectionCallbacks = {}
): BlinkDetectionWebSocketService {
  const service = createWebSocketService<
    BlinkDetectionResponse,
    BlinkDetectionCallbacks
  >({
    endpoint: BLINK_DETECTION_ENDPOINT,
    callbacks,
    messageMapper: (data: BlinkDetectionResponse) => {
      // Llamar al callback con la respuesta completa de detección
      callbacks.onBlinkDetection?.(data);
    },
  });

  // Extender el servicio con un método específico para enviar imágenes
  return {
    ...service,
    sendImage: (image: string) => {
      if (!service.isConnected()) {
        console.warn(
          "WebSocket no está conectado. No se puede enviar la imagen."
        );
        return;
      }

      const request: BlinkDetectionRequest = {
        image: image,
      };

      service.send(request);
    },
  };
}

/**
 * Obtiene la URL completa del WebSocket de detección de parpadeos
 * @returns URL completa del WebSocket
 */
export function getBlinkDetectionWebSocketUrl(): string {
  return BLINK_DETECTION_WS_URL;
}
