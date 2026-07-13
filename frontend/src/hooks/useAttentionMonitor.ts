/**
 * Hook de React para monitoreo de atención en tiempo real.
 * 
 * Maneja:
 * - Conexión WebSocket al backend
 * - Captura y envío de frames de la cámara
 * - Estado de atención y alertas
 * - Lógica de calibración
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
    AttentionMonitorService,
    createAttentionMonitorService,
    type ConnectionStatus
} from "@/services/websocket/attentionMonitorService";
import type {
    AttentionResponse,
    AttentionState,
    GazeData,
    PoseData,
    CalibrationData
} from "@/types/detection";

// Configuración
const FRAME_INTERVAL = 66; // ~15 FPS
const ALERT_THRESHOLD = 0.4;
const ALERT_DURATION = 3000; // 3 segundos antes de mostrar alerta
const CALIBRATION_STORAGE_KEY = "attention_calibration";

export interface UseAttentionMonitorOptions {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    enabled?: boolean;
    onAlert?: () => void;
}

export interface UseAttentionMonitorReturn {
    // Estado de conexión
    connectionStatus: ConnectionStatus;
    isConnected: boolean;

    // Métricas de atención
    attentionScore: number;
    status: "engaged" | "distracted" | "asleep" | "unknown";
    gaze: GazeData | null;
    pose: PoseData | null;
    isBlinking: boolean;
    warnings: string[];
    blinksPerMinute: number;
    faceDetected: boolean;

    // Alertas
    alertActive: boolean;

    // Calibración
    isCalibrated: boolean;
    isCalibrating: boolean;
    startCalibration: () => void;
    saveCalibrationPoint: (screenX: number, screenY: number) => void;
    finishCalibration: () => void;
    resetCalibration: () => void;

    // Controles
    connect: () => void;
    disconnect: () => void;
}

export function useAttentionMonitor({
    videoRef,
    canvasRef,
    enabled = true,
    onAlert
}: UseAttentionMonitorOptions): UseAttentionMonitorReturn {
    // Estado de conexión
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");

    // Métricas
    const [attentionScore, setAttentionScore] = useState(0);
    const [status, setStatus] = useState<"engaged" | "distracted" | "asleep" | "unknown">("unknown");
    const [gaze, setGaze] = useState<GazeData | null>(null);
    const [pose, setPose] = useState<PoseData | null>(null);
    const [isBlinking, setIsBlinking] = useState(false);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [blinksPerMinute, setBlinksPerMinute] = useState(0);
    const [faceDetected, setFaceDetected] = useState(false);

    // Alertas
    const [alertActive, setAlertActive] = useState(false);
    const lowScoreStartRef = useRef<number | null>(null);

    // Calibración
    const [isCalibrated, setIsCalibrated] = useState(false);
    const [isCalibrating, setIsCalibrating] = useState(false);
    const [calibrationData, setCalibrationData] = useState<CalibrationData | null>(null);

    // Referencias
    const serviceRef = useRef<AttentionMonitorService | null>(null);
    const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * Normaliza la respuesta del websocket y actualiza el estado visible.
     */
    const lastUpdateRef = useRef<number>(0);
    const prevMetricsRef = useRef<string>("");

    /**
     * US-09: Detección de rostro - Procesa la respuesta del servidor en tiempo real.
     */
    const handleMessage = useCallback((response: AttentionResponse) => {
        if (response.error) {
            console.warn("[useAttentionMonitor] Error del servidor:", response.error);
            return;
        }

        const now = Date.now();
        // Throttling: máximo 1 actualización cada 100ms
        if (now - lastUpdateRef.current < 100) return;

        // Optimización: Solo actualizar si los datos relevantes cambian
        const metricsHash = JSON.stringify({
            s: response.attention_score.toFixed(2),
            st: response.status,
            fd: response.face_detected,
            b: response.blink
        });

        if (metricsHash === prevMetricsRef.current) {
            // Si las métricas clave no cambiaron, solo actualizamos ref de tiempo y salimos
            lastUpdateRef.current = now;
            return;
        }

        prevMetricsRef.current = metricsHash;
        lastUpdateRef.current = now;

        // US-09: Actualizar estados locales de React con métricas de cara detectada y atención
        setAttentionScore(response.attention_score);
        setStatus(response.status);
        setGaze(response.gaze);
        setPose(response.pose);
        setIsBlinking(response.blink);
        setWarnings(response.warnings || []);
        setBlinksPerMinute(response.blinks_per_minute || 0);
        setFaceDetected(response.face_detected);

        // El umbral de alerta es de UI; no altera el score que entrega backend.
        if (response.attention_score < ALERT_THRESHOLD) {
            if (lowScoreStartRef.current === null) {
                lowScoreStartRef.current = Date.now();
            } else if (Date.now() - lowScoreStartRef.current > ALERT_DURATION) {
                if (!alertActive) {
                    setAlertActive(true);
                    onAlert?.();
                }
            }
        } else {
            lowScoreStartRef.current = null;
            setAlertActive(false);
        }
    }, [alertActive, onAlert]);

    /**
     * US-09: Detección de rostro - Captura un frame de video de la webcam y lo envía al servidor.
     */
    const captureAndSendFrame = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas || !serviceRef.current?.isConnected()) {
            return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // US-09: Ajustar dimensiones del canvas en función de la resolución nativa de la cámara
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
        }

        // US-09: Dibujar el frame actual de video sobre el lienzo canvas oculto
        ctx.drawImage(video, 0, 0);

        // US-09: Generar string Base64 en formato JPEG comprimido para reducir el payload de red
        const base64 = canvas.toDataURL("image/jpeg", 0.8);
        serviceRef.current.sendFrame(base64);
    }, [videoRef, canvasRef]);

    /**
     * Inicia la conexión y el envío de frames.
     */
    const connect = useCallback(() => {
        if (serviceRef.current?.isConnected()) return;

        // Crear servicio si no existe
        if (!serviceRef.current) {
            serviceRef.current = createAttentionMonitorService({
                onMessage: handleMessage,
                onStatusChange: setConnectionStatus,
                onError: (error) => console.error("[useAttentionMonitor] Error:", error)
            });
        }

        serviceRef.current.connect();

        // Iniciar envío de frames
        if (!frameIntervalRef.current) {
            frameIntervalRef.current = setInterval(captureAndSendFrame, FRAME_INTERVAL);
        }
    }, [handleMessage, captureAndSendFrame]);

    /**
     * Detiene la conexión y el envío de frames.
     */
    const disconnect = useCallback(() => {
        // Detener envío de frames
        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
        }

        // Desconectar servicio
        serviceRef.current?.disconnect();

        // Resetear estado
        setStatus("unknown");
        setAlertActive(false);
        lowScoreStartRef.current = null;
    }, []);

    // ===== Calibración =====

    const startCalibration = useCallback(() => {
        setIsCalibrating(true);
        setCalibrationData({
            centerGaze: { pitch: 0, yaw: 0 },
            timestamp: Date.now(),
            points: []
        });
    }, []);

    const saveCalibrationPoint = useCallback((screenX: number, screenY: number) => {
        if (!gaze || !calibrationData) return;

        setCalibrationData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                points: [
                    ...prev.points,
                    {
                        screenX,
                        screenY,
                        gazeYaw: gaze.yaw,
                        gazePitch: gaze.pitch
                    }
                ]
            };
        });
    }, [gaze, calibrationData]);

    const finishCalibration = useCallback(() => {
        if (!calibrationData || calibrationData.points.length < 5) {
            console.warn("[useAttentionMonitor] Calibración incompleta");
            return;
        }

        // Calcular centro promedio
        const avgYaw = calibrationData.points.reduce((sum, p) => sum + p.gazeYaw, 0) / calibrationData.points.length;
        const avgPitch = calibrationData.points.reduce((sum, p) => sum + p.gazePitch, 0) / calibrationData.points.length;

        const finalData: CalibrationData = {
            ...calibrationData,
            centerGaze: { yaw: avgYaw, pitch: avgPitch }
        };

        // Guardar en localStorage
        try {
            localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(finalData));
        } catch (e) {
            console.error("[useAttentionMonitor] Error guardando calibración:", e);
        }

        setCalibrationData(finalData);
        setIsCalibrated(true);
        setIsCalibrating(false);

        // Enviar calibración al backend
        if (serviceRef.current?.isConnected()) {
            serviceRef.current.sendMessage({
                type: "calibration",
                offset: {
                    yaw: avgYaw,
                    pitch: avgPitch
                }
            });
        }
    }, [calibrationData]);

    const resetCalibration = useCallback(() => {
        localStorage.removeItem(CALIBRATION_STORAGE_KEY);
        setCalibrationData(null);
        setIsCalibrated(false);
        setIsCalibrating(false);
    }, []);

    // Cargar calibración guardada al montar
    useEffect(() => {
        try {
            const saved = localStorage.getItem(CALIBRATION_STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved) as CalibrationData;
                setCalibrationData(data);
                setIsCalibrated(true);
            }
        } catch (e) {
            console.error("[useAttentionMonitor] Error cargando calibración:", e);
        }
    }, []);

    // Conectar/desconectar según enabled
    useEffect(() => {
        if (enabled) {
            connect();
        } else {
            disconnect();
        }

        return () => {
            disconnect();
        };
    }, [enabled, connect, disconnect]);

    return {
        // Estado de conexión
        connectionStatus,
        isConnected: connectionStatus === "connected",

        // Métricas
        attentionScore,
        status,
        gaze,
        pose,
        isBlinking,
        warnings,
        blinksPerMinute,
        faceDetected,

        // Alertas
        alertActive,

        // Calibración
        isCalibrated,
        isCalibrating,
        startCalibration,
        saveCalibrationPoint,
        finishCalibration,
        resetCalibration,

        // Controles
        connect,
        disconnect
    };
}
