"use client";

import { useState, useEffect, useRef } from "react";
import type { FaceDetectionResponse } from "@/types/detection";
import { ApiError, ErrorType } from "@/services/error";

export type ConnectionStatus = "connected" | "disconnected" | "checking";

/**
 * Hook para manejar el estado de conexión con el backend
 * @param timeoutMs - Tiempo en milisegundos antes de marcar como desconectado (default: 1000)
 * @returns Objeto con el estado de conexión y callbacks para actualizarlo
 */
export function useConnectionStatus(timeoutMs: number = 1000) {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("checking");
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Callback cuando se envía un frame exitosamente
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleFrameSent = (response: FaceDetectionResponse) => {
    setConnectionStatus("connected");
    // Limpiar timeout anterior si existe
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    // Si no hay respuesta en el tiempo especificado, marcar como desconectado
    connectionTimeoutRef.current = setTimeout(() => {
      setConnectionStatus("disconnected");
    }, timeoutMs);
  };

  // Callback cuando hay error al enviar frame
  const handleFrameError = (error: Error) => {
    // Solo marcar como desconectado si es un error de red o timeout
    if (error instanceof ApiError) {
      if (
        error.type === ErrorType.NETWORK_ERROR ||
        error.type === ErrorType.TIMEOUT_ERROR ||
        error.type === ErrorType.CORS_ERROR
      ) {
        setConnectionStatus("disconnected");
      }
    } else {
      // Para otros errores, también marcar como desconectado
      setConnectionStatus("disconnected");
    }
  };

  // Cleanup del timeout al desmontar
  useEffect(() => {
    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };
  }, []);

  return {
    connectionStatus,
    handleFrameSent,
    handleFrameError,
  };
}
