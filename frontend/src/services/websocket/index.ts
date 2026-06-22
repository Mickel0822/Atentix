/**
 * Exportaciones principales del módulo WebSocket
 */

// Componentes reutilizables de config
export * from "./config/types";
export * from "./config/errors";
export * from "./config/config";
export { BaseWebSocket } from "./config/baseWebSocket";
export { createWebSocketService } from "./config/createWebSocketService";

// Servicios específicos
export {
  createBlinkCountWebSocket,
  getBlinkCountWebSocketUrl,
  BLINK_COUNT_WS_URL,
  type BlinkCountCallbacks,
} from "./blinkCountService";

export {
  createBlinkDetectionWebSocket,
  getBlinkDetectionWebSocketUrl,
  BLINK_DETECTION_WS_URL,
  type BlinkDetectionCallbacks,
  type BlinkDetectionWebSocketService,
} from "./blinkDetectionService";
