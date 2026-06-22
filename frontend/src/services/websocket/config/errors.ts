import { WebSocketState, WebSocketErrorType } from "./types";

/**
 * Manejo de errores para WebSockets
 * Separado para reutilización en todos los servicios
 */

/**
 * Clase personalizada para errores de WebSocket
 */
export class WebSocketError extends Error {
  public readonly type: WebSocketErrorType;
  public readonly state?: WebSocketState;
  public readonly originalError?: unknown;
  public readonly code?: number;

  constructor(
    type: WebSocketErrorType,
    message: string,
    state?: WebSocketState,
    originalError?: unknown,
    code?: number
  ) {
    super(message);
    this.name = "WebSocketError";
    this.type = type;
    this.state = state;
    this.originalError = originalError;
    this.code = code;
    Object.setPrototypeOf(this, WebSocketError.prototype);
  }
}

/**
 * Maneja errores de WebSocket y los convierte en errores estructurados
 * @param error - Error capturado
 * @param state - Estado actual del WebSocket
 * @param code - Código de error del WebSocket (si está disponible)
 * @returns Error de WebSocket con información estructurada
 */
export function handleWebSocketError(
  error: unknown,
  state?: WebSocketState,
  code?: number
): WebSocketError {
  // Si ya es un WebSocketError, devolverlo tal cual
  if (error instanceof WebSocketError) {
    return error;
  }

  // Si es un Error estándar
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Detectar tipos específicos de errores
    if (message.includes("timeout") || message.includes("timed out")) {
      return new WebSocketError(
        WebSocketErrorType.CONNECTION_TIMEOUT,
        `Timeout de conexión: ${error.message}`,
        state,
        error,
        code
      );
    }

    if (
      message.includes("connection") ||
      message.includes("connect") ||
      message.includes("network")
    ) {
      return new WebSocketError(
        WebSocketErrorType.CONNECTION_ERROR,
        `Error de conexión: ${error.message}`,
        state,
        error,
        code
      );
    }

    if (message.includes("invalid") || message.includes("malformed")) {
      return new WebSocketError(
        WebSocketErrorType.INVALID_URL,
        `URL inválida: ${error.message}`,
        state,
        error,
        code
      );
    }

    // Error genérico
    return new WebSocketError(
      WebSocketErrorType.UNKNOWN_ERROR,
      error.message,
      state,
      error,
      code
    );
  }

  // Error desconocido
  return new WebSocketError(
    WebSocketErrorType.UNKNOWN_ERROR,
    "Error desconocido en WebSocket",
    state,
    error,
    code
  );
}

/**
 * Obtiene un mensaje de error amigable para mostrar al usuario
 * @param error - Error de WebSocket
 * @returns Mensaje de error formateado para el usuario
 */
export function getWebSocketErrorMessage(error: unknown): string {
  if (error instanceof WebSocketError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ha ocurrido un error inesperado en la conexión WebSocket";
}

/**
 * Obtiene el tipo de error para lógica condicional
 * @param error - Error de WebSocket
 * @returns Tipo de error o UNKNOWN_ERROR si no es un WebSocketError
 */
export function getWebSocketErrorType(error: unknown): WebSocketErrorType {
  if (error instanceof WebSocketError) {
    return error.type;
  }

  return WebSocketErrorType.UNKNOWN_ERROR;
}

/**
 * Verifica si un error es recuperable (puede reintentarse)
 * @param error - Error de WebSocket
 * @returns true si el error es recuperable, false en caso contrario
 */
export function isRecoverableWebSocketError(error: unknown): boolean {
  if (error instanceof WebSocketError) {
    // Errores de conexión y timeout son recuperables
    return (
      error.type === WebSocketErrorType.CONNECTION_ERROR ||
      error.type === WebSocketErrorType.CONNECTION_TIMEOUT ||
      error.type === WebSocketErrorType.RECONNECT_ERROR
    );
  }

  return false;
}

/**
 * Mapea códigos de cierre de WebSocket a mensajes descriptivos
 * @param code - Código de cierre del WebSocket
 * @returns Mensaje descriptivo del código
 */
export function getCloseCodeMessage(code: number): string {
  const closeCodeMessages: Record<number, string> = {
    1000: "Conexión cerrada normalmente",
    1001: "El endpoint se ha ido (por ejemplo, el servidor se apagó)",
    1002: "Conexión cerrada por error de protocolo",
    1003: "Conexión cerrada porque se recibió un tipo de dato no soportado",
    1004: "Reservado",
    1005: "No se recibió código de cierre (no debería aparecer en el evento close)",
    1006: "Conexión cerrada anormalmente (sin frame de cierre)",
    1007: "Datos inconsistentes recibidos",
    1008: "Mensaje viola la política del servidor",
    1009: "Mensaje demasiado grande para procesar",
    1010: "El cliente terminó la negociación de extensión",
    1011: "Error inesperado del servidor",
    1015: "Error de handshake TLS (no debería aparecer en el evento close)",
  };

  return closeCodeMessages[code] || `Conexión cerrada con código: ${code}`;
}
