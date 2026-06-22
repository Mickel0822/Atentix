/**
 * Configuración base para WebSockets
 * Separada para facilitar mantenimiento y cambios
 */

/**
 * URL base del WebSocket obtenida de las variables de entorno
 */
const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8000";

/**
 * Obtiene la URL base del WebSocket
 * @returns URL base del WebSocket
 */
export const getWebSocketBaseUrl = (): string => {
  return WS_BASE_URL;
};

/**
 * Construye una URL completa de WebSocket a partir de un endpoint
 * @param endpoint - Endpoint del WebSocket (ej: "/ws/blink/count")
 * @returns URL completa del WebSocket
 */
export const buildWebSocketUrl = (endpoint: string): string => {
  const baseUrl = getWebSocketBaseUrl();
  // Asegurar que el endpoint comience con /
  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;
  // Remover trailing slash de la base URL si existe
  const normalizedBaseUrl = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl;
  return `${normalizedBaseUrl}${normalizedEndpoint}`;
};
