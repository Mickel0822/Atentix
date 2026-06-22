"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createBlinkDetectionWebSocket } from "@/services/websocket/blinkDetectionService";
import { WebSocketState } from "@/services/websocket/config/types";
import type { BlinkDetectionResponse } from "@/types/detection";

/**
 * Hook para manejar la detección de parpadeos a través de WebSocket
 * Permite enviar imágenes y recibir respuestas de detección en tiempo real
 *
 * @param options - Opciones de configuración del hook
 * @param options.enabled - Si el WebSocket debe estar activo (por defecto: true)
 * @param options.onBlinkDetection - Callback cuando se detecta un parpadeo
 * @returns Objeto con el estado del WebSocket y métodos de control
 */
export function useBlinkDetectionWebSocket(
  options: {
    enabled?: boolean;
    onBlinkDetection?: (response: BlinkDetectionResponse) => void;
  } = {}
) {
  const { enabled = true, onBlinkDetection } = options;

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [connectionState, setConnectionState] = useState<WebSocketState>(
    WebSocketState.DISCONNECTED
  );
  const [lastDetection, setLastDetection] =
    useState<BlinkDetectionResponse | null>(null);

  const wsServiceRef = useRef<ReturnType<
    typeof createBlinkDetectionWebSocket
  > | null>(null);

  /**
   * Maneja la respuesta de detección de parpadeos
   */
  const handleBlinkDetection = useCallback(
    (response: BlinkDetectionResponse) => {
      setLastDetection(response);
      setIsLoading(false);
      onBlinkDetection?.(response);
    },
    [onBlinkDetection]
  );

  /**
   * Inicializa y conecta el WebSocket
   */
  const connect = useCallback(() => {
    if (wsServiceRef.current && wsServiceRef.current.isConnected()) {
      return; // Ya está conectado
    }

    // Limpiar conexión anterior si existe
    if (wsServiceRef.current) {
      wsServiceRef.current.disconnect();
    }

    setIsLoading(true);
    setError(null);

    try {
      // Crear nuevo servicio WebSocket
      wsServiceRef.current = createBlinkDetectionWebSocket({
        onBlinkDetection: handleBlinkDetection,
        onOpen: () => {
          setIsConnected(true);
          setConnectionState(WebSocketState.CONNECTED);
          setError(null);
          setIsLoading(false);
          console.log("[BlinkDetectionWS] Conectado exitosamente");
        },
        onError: (err: Error) => {
          setError(err);
          setIsConnected(false);
          setConnectionState(WebSocketState.ERROR);
          setIsLoading(false);
          console.error(
            "[BlinkDetectionWS] Error en WebSocket de detección de parpadeos:",
            err
          );
          console.error(
            "[BlinkDetectionWS] Asegúrate de que:",
            "\n  1. El servidor backend esté corriendo en el puerto 8000",
            "\n  2. La variable NEXT_PUBLIC_WS_BASE_URL o NEXT_PUBLIC_API_BASE_URL esté configurada",
            "\n  3. El endpoint /ws/detect/blink esté disponible en el backend"
          );
        },
        onClose: () => {
          setIsConnected(false);
          setConnectionState(WebSocketState.DISCONNECTED);
          console.log("[BlinkDetectionWS] Conexión cerrada");
        },
        onReconnect: (attempt: number) => {
          setConnectionState(WebSocketState.RECONNECTING);
          console.log(
            `[BlinkDetectionWS] Reintentando conexión (intento ${attempt})...`
          );
        },
        onReconnectFailed: () => {
          setError(new Error("No se pudo reconectar al WebSocket"));
          setIsConnected(false);
          setConnectionState(WebSocketState.ERROR);
          console.error(
            "[BlinkDetectionWS] Falló la reconexión después de múltiples intentos"
          );
        },
      });

      // Conectar
      wsServiceRef.current.connect();
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error("Error desconocido al crear WebSocket");
      setError(error);
      setIsLoading(false);
      setConnectionState(WebSocketState.ERROR);
      console.error(
        "[BlinkDetectionWS] Error al crear servicio WebSocket:",
        error
      );
    }
  }, [handleBlinkDetection]);

  /**
   * Desconecta el WebSocket
   */
  const disconnect = useCallback(() => {
    if (wsServiceRef.current) {
      wsServiceRef.current.disconnect();
      wsServiceRef.current = null;
    }
    setIsConnected(false);
    setConnectionState(WebSocketState.DISCONNECTED);
  }, []);

  /**
   * Envía una imagen al WebSocket para detección
   */
  const sendImage = useCallback((base64Image: string) => {
    if (!wsServiceRef.current || !wsServiceRef.current.isConnected()) {
      console.warn(
        "WebSocket no está conectado. No se puede enviar la imagen."
      );
      return;
    }

    setIsLoading(true);
    try {
      wsServiceRef.current.sendImage(base64Image);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Error desconocido");
      setError(error);
      setIsLoading(false);
      console.error("Error al enviar imagen:", error);
    }
  }, []);

  // Efecto para manejar la conexión/desconexión según el estado enabled
  useEffect(() => {
    if (enabled) {
      // Conectar WebSocket
      connect();
    } else {
      // Desconectar si está deshabilitado
      disconnect();
    }

    // Cleanup: desconectar al desmontar o cuando cambia enabled
    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isLoading,
    error,
    connectionState,
    lastDetection,
    connect,
    disconnect,
    sendImage,
  };
}


