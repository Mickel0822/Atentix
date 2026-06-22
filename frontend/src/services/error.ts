import { AxiosError } from "axios";

/**
 * Tipos de errores comunes en la aplicación
 */
export enum ErrorType {
  NETWORK_ERROR = "NETWORK_ERROR",
  CORS_ERROR = "CORS_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  SERVER_ERROR = "SERVER_ERROR",
  CLIENT_ERROR = "CLIENT_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Interfaz para errores personalizados de la aplicación
 */
export interface AppError {
  type: ErrorType;
  message: string;
  statusCode?: number;
  originalError?: unknown;
}

/**
 * Clase personalizada para errores de la aplicación
 */
export class ApiError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode?: number;
  public readonly originalError?: unknown;

  constructor(
    type: ErrorType,
    message: string,
    statusCode?: number,
    originalError?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.type = type;
    this.statusCode = statusCode;
    this.originalError = originalError;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Maneja errores de axios y los convierte en errores de la aplicación
 * @param error - Error capturado (puede ser de axios o cualquier otro tipo)
 * @returns Error de la aplicación con información estructurada
 */
export function handleApiError(error: unknown): ApiError {
  // Si es un error de axios
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError;

    // Error de red (sin respuesta del servidor)
    if (!axiosError.response) {
      // Verificar si es un error de CORS
      if (
        axiosError.code === "ERR_NETWORK" ||
        axiosError.message.includes("CORS") ||
        axiosError.message.includes("cors")
      ) {
        return new ApiError(
          ErrorType.CORS_ERROR,
          "Error de CORS: El backend no permite solicitudes desde este origen. Verifica la configuración CORS del backend.",
          undefined,
          axiosError
        );
      }

      // Verificar si es un error de timeout
      if (
        axiosError.code === "ECONNABORTED" ||
        axiosError.message.includes("timeout")
      ) {
        return new ApiError(
          ErrorType.TIMEOUT_ERROR,
          "Error de timeout: La petición tardó demasiado en responder. Verifica la conexión al servidor.",
          undefined,
          axiosError
        );
      }

      // Error de conexión genérico
      return new ApiError(
        ErrorType.NETWORK_ERROR,
        "Error de conexión: No se pudo conectar al servidor. ¿Está el backend corriendo?",
        undefined,
        axiosError
      );
    }

    // Error del servidor (con respuesta)
    const status = axiosError.response.status;
    const responseData = axiosError.response.data as
      | { detail?: string; message?: string }
      | undefined;
    const message =
      responseData?.detail ||
      responseData?.message ||
      axiosError.message ||
      "Error desconocido del servidor";

    // Clasificar por código de estado
    if (status >= 500) {
      return new ApiError(
        ErrorType.SERVER_ERROR,
        `Error del servidor (${status}): ${message}`,
        status,
        axiosError
      );
    } else if (status >= 400) {
      return new ApiError(
        ErrorType.CLIENT_ERROR,
        `Error del cliente (${status}): ${message}`,
        status,
        axiosError
      );
    }
  }

  // Si es un Error estándar de JavaScript
  if (error instanceof Error) {
    return new ApiError(
      ErrorType.UNKNOWN_ERROR,
      error.message,
      undefined,
      error
    );
  }

  // Error desconocido
  return new ApiError(
    ErrorType.UNKNOWN_ERROR,
    "Error desconocido al procesar la petición",
    undefined,
    error
  );
}

/**
 * Verifica si un error es un error de axios
 */
function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === "object" &&
    error !== null &&
    "isAxiosError" in error &&
    (error as AxiosError).isAxiosError === true
  );
}

/**
 * Obtiene un mensaje de error amigable para mostrar al usuario
 * @param error - Error de la aplicación
 * @returns Mensaje de error formateado para el usuario
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ha ocurrido un error inesperado";
}

/**
 * Obtiene el tipo de error para lógica condicional
 * @param error - Error de la aplicación
 * @returns Tipo de error o UNKNOWN_ERROR si no es un ApiError
 */
export function getErrorType(error: unknown): ErrorType {
  if (error instanceof ApiError) {
    return error.type;
  }

  return ErrorType.UNKNOWN_ERROR;
}

/**
 * Verifica si un error es recuperable (puede reintentarse)
 * @param error - Error de la aplicación
 * @returns true si el error es recuperable, false en caso contrario
 */
export function isRecoverableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    // Errores de red y timeout son recuperables
    return (
      error.type === ErrorType.NETWORK_ERROR ||
      error.type === ErrorType.TIMEOUT_ERROR
    );
  }

  return false;
}

/**
 * Extrae el mensaje de detalle (detail) directamente del error de axios
 * @param error - Error capturado
 * @returns El mensaje de detail si existe, o undefined
 */
export function getErrorDetail(error: unknown): string | undefined {
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError;
    if (axiosError.response?.data) {
      const responseData = axiosError.response.data as
        | { detail?: string }
        | undefined;
      return responseData?.detail;
    }
  }
  return undefined;
}

/**
 * Extrae tanto el message como el detail del error de axios
 * @param error - Error capturado (puede ser ApiError o AxiosError)
 * @returns Objeto con message y detail si existen
 */
export function getErrorMessages(error: unknown): {
  message?: string;
  detail?: string;
} {
  // Si es un ApiError, buscar en el originalError
  if (error instanceof ApiError && error.originalError) {
    return getErrorMessages(error.originalError);
  }

  // Si es un AxiosError directamente
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError;
    if (axiosError.response?.data) {
      const responseData = axiosError.response.data as
        | { message?: string; detail?: string }
        | undefined;
      return {
        message: responseData?.message,
        detail: responseData?.detail,
      };
    }
  }
  return {};
}