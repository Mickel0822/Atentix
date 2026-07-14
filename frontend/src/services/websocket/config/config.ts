/**
 * Configuración base para WebSockets
 * Separada para facilitar mantenimiento y cambios
 */

/**
 * URL base del WebSocket obtenida de las variables de entorno
 */
const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "ws://localhost:8000";

export const normalizeWebSocketBaseUrl = (
  baseUrl: string,
  secureContext =
    typeof window !== "undefined" && window.location.protocol === "https:"
): string => {
  let normalizedUrl = baseUrl.trim().replace(/\/$/, "");

  if (normalizedUrl.startsWith("https://")) {
    normalizedUrl = normalizedUrl.replace("https://", "wss://");
  } else if (normalizedUrl.startsWith("http://")) {
    normalizedUrl = normalizedUrl.replace("http://", "ws://");
  }

  if (secureContext && normalizedUrl.startsWith("ws://")) {
    normalizedUrl = normalizedUrl.replace("ws://", "wss://");
  }

  return normalizedUrl;
};

/**
 * Obtiene la URL base del WebSocket
 * @returns URL base del WebSocket
 */
export const getWebSocketBaseUrl = (): string => {
  return normalizeWebSocketBaseUrl(WS_BASE_URL);
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
  return `${baseUrl}${normalizedEndpoint}`;
};
