import {
  WebSocketConfig,
  WebSocketCallbacks,
  WebSocketState,
  WebSocketErrorType,
  ReconnectConfig,
  ReconnectInfo,
} from "./types";
import {
  WebSocketError,
  handleWebSocketError,
  getCloseCodeMessage,
} from "./errors";

/**
 * Configuración por defecto para reconexión
 */
const DEFAULT_RECONNECT_CONFIG: ReconnectConfig = {
  enabled: true,
  maxAttempts: -1, // Infinito por defecto
  initialDelay: 1000, // 1 segundo
  maxDelay: 30000, // 30 segundos
  backoffMultiplier: 1.5,
};

/**
 * Clase base reutilizable para manejar conexiones WebSocket
 * Proporciona funcionalidades como reconexión automática, manejo de errores,
 * heartbeat, y gestión de estado.
 */
export class BaseWebSocket<T = unknown> {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private callbacks: WebSocketCallbacks<T>;
  private state: WebSocketState = WebSocketState.DISCONNECTED;
  private reconnectConfig: ReconnectConfig;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private isManualClose: boolean = false;

  constructor(config: WebSocketConfig, callbacks: WebSocketCallbacks<T> = {}) {
    this.config = config;
    this.callbacks = callbacks;
    this.reconnectConfig = {
      ...DEFAULT_RECONNECT_CONFIG,
      ...config.reconnect,
    };
  }

  /**
   * Conecta al WebSocket
   */
  public connect(): void {
    if (this.state === WebSocketState.CONNECTED) {
      console.warn("WebSocket ya está conectado");
      return;
    }

    if (this.state === WebSocketState.CONNECTING) {
      console.warn("WebSocket ya está intentando conectar");
      return;
    }

    this.isManualClose = false;
    this.setState(WebSocketState.CONNECTING);

    try {
      this.ws = new WebSocket(this.config.url, this.config.protocols);
      this.setupEventHandlers();

      // Timeout para la conexión inicial
      if (this.config.timeout && this.config.timeout > 0) {
        this.connectionTimeout = setTimeout(() => {
          if (this.state === WebSocketState.CONNECTING) {
            this.ws?.close();
            const error = new WebSocketError(
              WebSocketErrorType.CONNECTION_TIMEOUT,
              `Timeout de conexión después de ${this.config.timeout}ms`,
              this.state
            );
            this.handleError(error);
          }
        }, this.config.timeout);
      }
    } catch (error) {
      const wsError = handleWebSocketError(error, this.state);
      this.handleError(wsError);
      this.setState(WebSocketState.ERROR);
    }
  }

  /**
   * Desconecta el WebSocket
   */
  public disconnect(): void {
    this.isManualClose = true;
    this.clearTimers();
    this.cancelReconnect();

    if (this.ws) {
      this.setState(WebSocketState.DISCONNECTING);
      this.ws.close(1000, "Desconexión manual");
      this.ws = null;
    }

    this.setState(WebSocketState.DISCONNECTED);
  }

  /**
   * Envía un mensaje a través del WebSocket
   * @param data - Datos a enviar (serán serializados a JSON si es un objeto)
   */
  public send(data: unknown): void {
    if (!this.ws || this.state !== WebSocketState.CONNECTED) {
      throw new WebSocketError(
        WebSocketErrorType.INVALID_STATE,
        "WebSocket no está conectado. No se puede enviar el mensaje.",
        this.state
      );
    }

    try {
      const message = typeof data === "string" ? data : JSON.stringify(data);
      this.ws.send(message);
    } catch (error) {
      const wsError = new WebSocketError(
        WebSocketErrorType.MESSAGE_ERROR,
        error instanceof Error ? error.message : "Error al enviar mensaje",
        this.state,
        error
      );
      this.handleError(wsError);
    }
  }

  /**
   * Obtiene el estado actual del WebSocket
   */
  public getState(): WebSocketState {
    return this.state;
  }

  /**
   * Verifica si el WebSocket está conectado
   */
  public isConnected(): boolean {
    return this.state === WebSocketState.CONNECTED;
  }

  /**
   * Obtiene información sobre el estado de reconexión
   */
  public getReconnectInfo(): ReconnectInfo | null {
    if (!this.reconnectConfig.enabled || this.isManualClose) {
      return null;
    }

    return {
      attempt: this.reconnectAttempts,
      maxAttempts: this.reconnectConfig.maxAttempts || -1,
      nextDelay: this.calculateReconnectDelay(),
    };
  }

  /**
   * Actualiza los callbacks
   */
  public updateCallbacks(callbacks: Partial<WebSocketCallbacks<T>>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Configura los manejadores de eventos del WebSocket
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = (event: Event) => {
      this.clearConnectionTimeout();
      this.reconnectAttempts = 0;
      this.cancelReconnect();
      this.setState(WebSocketState.CONNECTED);
      this.startHeartbeat();
      this.callbacks.onOpen?.(event);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        let data: T;
        const rawData = event.data;

        // Intentar parsear como JSON, si falla usar el string directamente
        if (typeof rawData === "string") {
          try {
            data = JSON.parse(rawData) as T;
          } catch {
            data = rawData as T;
          }
        } else {
          data = rawData as T;
        }

        this.callbacks.onMessage?.(data);
      } catch (error) {
        const wsError = new WebSocketError(
          WebSocketErrorType.MESSAGE_ERROR,
          error instanceof Error ? error.message : "Error al procesar mensaje",
          this.state,
          error
        );
        this.handleError(wsError);
      }
    };

    this.ws.onerror = (event: Event) => {
      const error = new WebSocketError(
        WebSocketErrorType.CONNECTION_ERROR,
        "Error en la conexión WebSocket",
        this.state,
        event
      );
      this.handleError(error);
    };

    this.ws.onclose = (event: CloseEvent) => {
      this.clearConnectionTimeout();
      this.stopHeartbeat();
      this.setState(WebSocketState.DISCONNECTED);

      // Si no fue un cierre manual, intentar reconectar
      if (!this.isManualClose && this.reconnectConfig.enabled) {
        this.attemptReconnect();
      }

      this.callbacks.onClose?.(event);
    };
  }

  /**
   * Maneja errores del WebSocket
   */
  private handleError(error: WebSocketError): void {
    this.setState(WebSocketState.ERROR);
    this.callbacks.onError?.(error);
  }

  /**
   * Intenta reconectar el WebSocket
   */
  private attemptReconnect(): void {
    if (this.isManualClose) {
      return;
    }

    const maxAttempts = this.reconnectConfig.maxAttempts;
    if (maxAttempts !== undefined && maxAttempts !== -1) {
      if (this.reconnectAttempts >= maxAttempts) {
        this.callbacks.onReconnectFailed?.();
        return;
      }
    }

    this.reconnectAttempts++;
    this.setState(WebSocketState.RECONNECTING);

    const delay = this.calculateReconnectDelay();
    this.reconnectTimer = setTimeout(() => {
      this.callbacks.onReconnect?.(this.reconnectAttempts);
      this.connect();
    }, delay);
  }

  /**
   * Calcula el delay para la próxima reconexión usando backoff exponencial
   */
  private calculateReconnectDelay(): number {
    const {
      initialDelay = 1000,
      maxDelay = 30000,
      backoffMultiplier = 1.5,
    } = this.reconnectConfig;

    const delay = Math.min(
      initialDelay * Math.pow(backoffMultiplier, this.reconnectAttempts - 1),
      maxDelay
    );

    return Math.floor(delay);
  }

  /**
   * Cancela el intento de reconexión programado
   */
  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  /**
   * Inicia el heartbeat (ping/pong) para mantener la conexión viva
   */
  private startHeartbeat(): void {
    if (!this.config.heartbeatInterval || this.config.heartbeatInterval <= 0) {
      return;
    }

    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected() && this.ws) {
        try {
          // Enviar un ping (puedes personalizar el mensaje según tu protocolo)
          this.ws.send(JSON.stringify({ type: "ping" }));
        } catch (error) {
          const wsError = handleWebSocketError(error, this.state);
          this.handleError(wsError);
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Detiene el heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Limpia todos los timers
   */
  private clearTimers(): void {
    this.clearConnectionTimeout();
    this.stopHeartbeat();
    this.cancelReconnect();
  }

  /**
   * Limpia el timeout de conexión
   */
  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  /**
   * Actualiza el estado del WebSocket
   */
  private setState(newState: WebSocketState): void {
    if (this.state !== newState) {
      this.state = newState;
    }
  }
}
