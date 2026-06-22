import { BaseWebSocket } from "./baseWebSocket";
import { buildWebSocketUrl } from "./config";
import {
  WebSocketServiceConfig,
  WebSocketCallbacks,
  WebSocketService,
  WebSocketState,
  ReconnectInfo,
  ReconnectConfig,
} from "./types";

/**
 * Factory genérico para crear servicios WebSocket configurables
 * Elimina la necesidad de crear clases wrapper repetitivas para cada servicio
 *
 * @template TResponse - Tipo de la respuesta del WebSocket
 * @template TCallbacks - Tipo de los callbacks específicos del servicio
 * @param config - Configuración del servicio WebSocket
 * @returns Instancia del servicio WebSocket con métodos estándar
 */
export function createWebSocketService<
  TResponse,
  TCallbacks extends Record<string, any>
>(config: WebSocketServiceConfig<TResponse, TCallbacks>): WebSocketService {
  const {
    endpoint,
    callbacks,
    reconnect,
    heartbeatInterval = 30000,
    timeout = 10000,
    messageMapper,
    protocols,
  } = config;

  // Construir URL completa
  const url = buildWebSocketUrl(endpoint);

  // Configuración de reconexión por defecto
  const reconnectConfig: ReconnectConfig = {
    enabled: true,
    maxAttempts: -1, // Infinito por defecto
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 1.5,
    ...reconnect,
  };

  // Mapear callbacks específicos a callbacks genéricos del BaseWebSocket
  const wsCallbacks: WebSocketCallbacks<TResponse> = {
    onOpen: (event: Event) => {
      if ("onOpen" in callbacks && typeof callbacks.onOpen === "function") {
        (callbacks.onOpen as () => void)();
      }
    },
    onMessage: (data: TResponse) => {
      // Si hay un messageMapper, usarlo para transformar el mensaje
      if (messageMapper) {
        messageMapper(data);
      }
      // También llamar al callback genérico onMessage si existe
      if (
        "onMessage" in callbacks &&
        typeof callbacks.onMessage === "function"
      ) {
        (callbacks.onMessage as (data: TResponse) => void)(data);
      }
    },
    onError: (error: Error) => {
      if ("onError" in callbacks && typeof callbacks.onError === "function") {
        (callbacks.onError as (error: Error) => void)(error);
      }
    },
    onClose: (event: CloseEvent) => {
      if ("onClose" in callbacks && typeof callbacks.onClose === "function") {
        (callbacks.onClose as () => void)();
      }
    },
    onReconnect: (attempt: number) => {
      if (
        "onReconnect" in callbacks &&
        typeof callbacks.onReconnect === "function"
      ) {
        (callbacks.onReconnect as (attempt: number) => void)(attempt);
      }
    },
    onReconnectFailed: () => {
      if (
        "onReconnectFailed" in callbacks &&
        typeof callbacks.onReconnectFailed === "function"
      ) {
        (callbacks.onReconnectFailed as () => void)();
      }
    },
  };

  // Crear instancia del BaseWebSocket
  const baseWebSocket = new BaseWebSocket<TResponse>(
    {
      url,
      protocols,
      reconnect: reconnectConfig,
      heartbeatInterval,
      timeout,
    },
    wsCallbacks
  );

  // Retornar interfaz del servicio con métodos estándar
  return {
    connect: () => baseWebSocket.connect(),
    disconnect: () => baseWebSocket.disconnect(),
    isConnected: () => baseWebSocket.isConnected(),
    getState: () => baseWebSocket.getState(),
    getReconnectInfo: () => baseWebSocket.getReconnectInfo(),
    updateCallbacks: (newCallbacks: Partial<WebSocketCallbacks>) => {
      baseWebSocket.updateCallbacks(newCallbacks);
    },
    send: (data: unknown) => baseWebSocket.send(data),
  };
}
