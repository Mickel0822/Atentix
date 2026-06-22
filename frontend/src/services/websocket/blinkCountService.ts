import { createWebSocketService } from "./config/createWebSocketService";
import { buildWebSocketUrl } from "./config/config";
import type { BlinkCountResponse } from "@/types/detection";
import type { WebSocketService } from "./config/types";

/**
 * Endpoint específico para el contador de parpadeos
 */
const BLINK_COUNT_ENDPOINT = "/ws/blink/count";

/**
 * URL completa para el WebSocket de contador de parpadeos
 */
export const BLINK_COUNT_WS_URL = buildWebSocketUrl(BLINK_COUNT_ENDPOINT);

/**
 * Callbacks específicos para el WebSocket de contador de parpadeos
 */
export interface BlinkCountCallbacks {
  onCountUpdate?: (count: number) => void;
  onOpen?: () => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  onReconnect?: (attempt: number) => void;
  onReconnectFailed?: () => void;
}

/**
 * Crea una instancia del servicio WebSocket para recibir actualizaciones
 * del contador de parpadeos en tiempo real desde el servidor.
 *
 * @param callbacks - Callbacks para manejar eventos del WebSocket
 * @returns Instancia del servicio WebSocket configurado para el contador de parpadeos
 */
export function createBlinkCountWebSocket(
  callbacks: BlinkCountCallbacks = {}
): WebSocketService {
  return createWebSocketService<BlinkCountResponse, BlinkCountCallbacks>({
    endpoint: BLINK_COUNT_ENDPOINT,
    callbacks,
    messageMapper: (data: BlinkCountResponse) => {
      // Extraer el contador de la respuesta y llamar al callback
      const count = data.blink_count ?? 0;
      callbacks.onCountUpdate?.(count);
    },
  });
}

/**
 * Obtiene la URL completa del WebSocket de contador de parpadeos
 * @returns URL completa del WebSocket
 */
export function getBlinkCountWebSocketUrl(): string {
  return BLINK_COUNT_WS_URL;
}
