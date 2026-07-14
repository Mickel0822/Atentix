/**
 * Servicio WebSocket para monitoreo de atención en tiempo real.
 * 
 * Maneja la conexión persistente con el backend y envía frames
 * de video para recibir métricas de atención.
 */

import type { AttentionResponse } from "@/types/detection";
import { buildWebSocketUrl } from "./config/config";

// Configuración del WebSocket
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
     * US-09: Detección de rostro - Inicia la conexión WebSocket para transmitir vídeo de la webcam.
     */
    connect(): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log("[AttentionMonitorService] Ya conectado");
            return;
        }

        this.isIntentionallyClosed = false;
        this.config.onStatusChange("connecting");

        try {
            const url = buildWebSocketUrl(WS_ENDPOINT);
            console.log(`[AttentionMonitorService] Conectando a ${url}...`);

            // US-09: Crear instancia de conexión WebSocket al endpoint del backend
            // US-10: Abrir la conexión persistente que transporta frames y métricas de atención.
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log("[AttentionMonitorService] ✅ Conectado");
                this.reconnectAttempts = 0;
                this.config.onStatusChange("connected");
            };

            // US-09: Escuchar respuestas del servidor que contienen el estado de detección del rostro
            // US-10: Recibir el Engagement Index, estado, advertencias y datos visuales del backend.
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
     * US-09: Detección de rostro - Transmite un frame de vídeo en Base64 al backend.
     * @param base64Image - Imagen de la cámara del estudiante
     */
    sendFrame(base64Image: string): boolean {
        if (this.ws?.readyState !== WebSocket.OPEN) {
            return false;
        }

        try {
            // US-09: Sanitizar el string de la imagen removiendo la cabecera MIME si estuviera presente
            // US-10: Preparar el frame de cámara para enviarlo como payload JSON al backend.
            const base64Data = base64Image.includes(",")
                ? base64Image.split(",")[1]
                : base64Image;

            // US-09: Serializar y enviar frame en JSON a través del WebSocket abierto
            // US-10: Transmitir el frame únicamente cuando la conexión está disponible.
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
