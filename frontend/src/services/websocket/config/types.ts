/**
 * Tipos compartidos para WebSockets
 */

/**
 * Estados posibles de una conexión WebSocket
 */
export enum WebSocketState {
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  DISCONNECTING = "DISCONNECTING",
  DISCONNECTED = "DISCONNECTED",
  RECONNECTING = "RECONNECTING",
  ERROR = "ERROR",
}

/**
 * Tipos de errores específicos de WebSocket
 */
export enum WebSocketErrorType {
  CONNECTION_ERROR = "CONNECTION_ERROR",
  CONNECTION_TIMEOUT = "CONNECTION_TIMEOUT",
  MESSAGE_ERROR = "MESSAGE_ERROR",
  CLOSE_ERROR = "CLOSE_ERROR",
  RECONNECT_ERROR = "RECONNECT_ERROR",
  INVALID_STATE = "INVALID_STATE",
  INVALID_URL = "INVALID_URL",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Configuración para reconexión automática
 */
export interface ReconnectConfig {
  enabled: boolean;
  maxAttempts?: number; // Número máximo de intentos de reconexión (-1 para infinito)
  initialDelay?: number; // Delay inicial en ms
  maxDelay?: number; // Delay máximo en ms
  backoffMultiplier?: number; // Multiplicador para el backoff exponencial
}

/**
 * Configuración para un WebSocket
 */
export interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  reconnect?: ReconnectConfig;
  heartbeatInterval?: number; // Intervalo para heartbeat en ms (0 para deshabilitar)
  timeout?: number; // Timeout para la conexión inicial en ms
}

/**
 * Callbacks genéricos para eventos del WebSocket
 */
export interface WebSocketCallbacks<T = unknown> {
  onOpen?: (event: Event) => void;
  onMessage?: (data: T) => void;
  onError?: (error: Error) => void;
  onClose?: (event: CloseEvent) => void;
  onReconnect?: (attempt: number) => void;
  onReconnectFailed?: () => void;
}

/**
 * Información sobre el estado de reconexión
 */
export interface ReconnectInfo {
  attempt: number;
  maxAttempts: number;
  nextDelay: number;
}

/**
 * Configuración para crear un servicio WebSocket usando el factory
 */
export interface WebSocketServiceConfig<TResponse, TCallbacks> {
  endpoint: string;
  callbacks: TCallbacks;
  reconnect?: ReconnectConfig;
  heartbeatInterval?: number;
  timeout?: number;
  messageMapper?: (data: TResponse) => void;
  protocols?: string | string[];
}

/**
 * Interfaz del servicio WebSocket retornado por el factory
 */
export interface WebSocketService {
  connect: () => void;
  disconnect: () => void;
  isConnected: () => boolean;
  getState: () => WebSocketState;
  getReconnectInfo: () => ReconnectInfo | null;
  updateCallbacks: (callbacks: Partial<WebSocketCallbacks>) => void;
  send: (data: unknown) => void;
}
