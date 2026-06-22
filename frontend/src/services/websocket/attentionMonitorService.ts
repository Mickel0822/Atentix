/**
 * Servicio WebSocket para monitoreo de atención en tiempo real.
 * 
 * Maneja la conexión persistente con el backend y envía frames
 * de video para recibir métricas de atención.
 */

import type { AttentionResponse } from "@/types/detection";

// Configuración del WebSocket
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8000";
const WS_ENDPOINT = "/ws/monitor";
const RECONNECT_DELAY = 2000; // ms
const MAX_RECONNECT_ATTEMPTS = 5;

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export interface AttentionMonitorServiceConfig {
    onMessage: (response: AttentionResponse) => void;
    onStatusChange: (status: ConnectionStatus) => void;
    onError?: (error: string) => void;
}

/**
 * Clase para manejar la conexión WebSocket de monitoreo de atención.
 */
export class AttentionMonitorService {
    private ws: WebSocket | null = null;
    private config: AttentionMonitorServiceConfig;
    private reconnectAttempts = 0;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private isIntentionallyClosed = false;

    constructor(config: AttentionMonitorServiceConfig) {
        this.config = config;
    }

    /**
     * Inicia la conexión WebSocket.
     */
    connect(): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log("[AttentionMonitorService] Ya conectado");
            return;
        }

        this.isIntentionallyClosed = false;
        this.config.onStatusChange("connecting");

        try {
            let baseUrl = WS_BASE_URL;

            // Si estamos en HTTPS (producción/Vercel) y la URL es ws://, convertir a wss://
            if (typeof window !== "undefined" && window.location.protocol === "https:" && baseUrl.startsWith("ws://")) {
                baseUrl = baseUrl.replace("ws://", "wss://");
            }

            const url = `${baseUrl}${WS_ENDPOINT}`;
            console.log(`[AttentionMonitorService] Conectando a ${url}...`);

            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log("[AttentionMonitorService] ✅ Conectado");
                this.reconnectAttempts = 0;
                this.config.onStatusChange("connected");
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data) as AttentionResponse;
                    this.config.onMessage(data);
                } catch (error) {
                    console.error("[AttentionMonitorService] Error parseando mensaje:", error);
                }
            };

            this.ws.onerror = (error) => {
                console.error("[AttentionMonitorService] Error:", error);
                this.config.onStatusChange("error");
                this.config.onError?.("Error de conexión WebSocket");
            };

            this.ws.onclose = (event) => {
                console.log(`[AttentionMonitorService] Conexión cerrada (code: ${event.code})`);
                this.config.onStatusChange("disconnected");

                // Intentar reconectar si no fue cerrado intencionalmente
                if (!this.isIntentionallyClosed && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    this.scheduleReconnect();
                }
            };

        } catch (error) {
            console.error("[AttentionMonitorService] Error creando WebSocket:", error);
            this.config.onStatusChange("error");
        }
    }

    /**
     * Programa un intento de reconexión.
     */
    private scheduleReconnect(): void {
        this.reconnectAttempts++;
        console.log(`[AttentionMonitorService] Reconectando... intento ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);

        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, RECONNECT_DELAY);
    }

    /**
     * Envía un mensaje genérico al servidor.
     */
    sendMessage(data: any): boolean {
        if (this.ws?.readyState !== WebSocket.OPEN) {
            return false;
        }

        try {
            this.ws.send(JSON.stringify(data));
            return true;
        } catch (error) {
            console.error("[AttentionMonitorService] Error enviando mensaje:", error);
            return false;
        }
    }

    /**
     * Envía un frame de imagen al servidor.
     * @param base64Image - Imagen en formato Base64
     */
    sendFrame(base64Image: string): boolean {
        if (this.ws?.readyState !== WebSocket.OPEN) {
            return false;
        }

        try {
            // Remover prefijo data:image/... si existe
            const base64Data = base64Image.includes(",")
                ? base64Image.split(",")[1]
                : base64Image;

            const message = JSON.stringify({ image: base64Data });
            this.ws.send(message);
            return true;
        } catch (error) {
            console.error("[AttentionMonitorService] Error enviando frame:", error);
            return false;
        }
    }

    /**
     * Cierra la conexión WebSocket.
     */
    disconnect(): void {
        this.isIntentionallyClosed = true;

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.config.onStatusChange("disconnected");
        console.log("[AttentionMonitorService] Desconectado");
    }

    /**
     * Verifica si está conectado.
     */
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

/**
 * Factory function para crear una instancia del servicio.
 */
export function createAttentionMonitorService(
    config: AttentionMonitorServiceConfig
): AttentionMonitorService {
    return new AttentionMonitorService(config);
}
