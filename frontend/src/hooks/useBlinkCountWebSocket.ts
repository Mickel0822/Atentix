"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createBlinkCountWebSocket } from "@/services/websocket/blinkCountService";
import { obtenerContadorParpadeos } from "@/services/blinkService";
import { WebSocketState } from "@/services/websocket/config/types";

/**
 * Hook para manejar el contador de parpadeos a través de WebSocket
 * Proporciona actualizaciones en tiempo real del contador
 *
 * @param options - Opciones de configuración del hook
 * @param options.enabled - Si el WebSocket debe estar activo (por defecto: true)
 * @param options.initialFetch - Si debe obtener el contador inicial vía HTTP (por defecto: true)
 * @returns Objeto con el estado del contador y métodos de control
 */
export function useBlinkCountWebSocket(
  options: {
    enabled?: boolean;
    initialFetch?: boolean;
  } = {}
) {
  const { enabled = true, initialFetch = true } = options;

  const [blinkCount, setBlinkCount] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [connectionState, setConnectionState] = useState<WebSocketState>(
    WebSocketState.DISCONNECTED
  );

  const wsServiceRef = useRef<ReturnType<
    typeof createBlinkCountWebSocket
  > | null>(null);

  /**
   * Actualiza el estado del contador
   */
  const updateCount = useCallback((count: number) => {
    setBlinkCount(count);
    setIsLoading(false);
  }, []);

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

    // Crear nuevo servicio WebSocket
    wsServiceRef.current = createBlinkCountWebSocket({
      onCountUpdate: (count: number) => {
        updateCount(count);
      },
      onOpen: () => {
        setIsConnected(true);
        setConnectionState(WebSocketState.CONNECTED);
        setError(null);
      },
      onError: (err: Error) => {
        setError(err);
        setIsConnected(false);
        setConnectionState(WebSocketState.ERROR);
        setIsLoading(false);
        console.error("Error en WebSocket de contador de parpadeos:", err);
      },
      onClose: () => {
        setIsConnected(false);
        setConnectionState(WebSocketState.DISCONNECTED);
      },
      onReconnect: (attempt: number) => {
        setConnectionState(WebSocketState.RECONNECTING);
        console.log(`Reintentando conexión (intento ${attempt})...`);
      },
      onReconnectFailed: () => {
        setError(new Error("No se pudo reconectar al WebSocket"));
        setIsConnected(false);
        setConnectionState(WebSocketState.ERROR);
      },
    });

    // Conectar
    wsServiceRef.current.connect();
  }, [updateCount]);

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
   * Obtiene el contador inicial vía HTTP
   */
  const fetchInitialCount = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await obtenerContadorParpadeos();
      updateCount(response.blink_count);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Error desconocido");
      setError(error);
      console.error("Error al obtener contador inicial:", error);
    } finally {
      setIsLoading(false);
    }
  }, [updateCount]);

  // Efecto para manejar la conexión/desconexión según el estado enabled
  useEffect(() => {
    if (enabled) {
      // Obtener contador inicial si está habilitado
      if (initialFetch) {
        fetchInitialCount();
      }
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
  }, [enabled, initialFetch, connect, disconnect, fetchInitialCount]);

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    blinkCount,
    isConnected,
    isLoading,
    error,
    connectionState,
    connect,
    disconnect,
    refresh: fetchInitialCount,
  };
}
