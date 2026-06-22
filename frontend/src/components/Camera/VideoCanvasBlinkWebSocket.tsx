"use client";

import { useRef, useEffect } from "react";
import type { VideoCanvasBlinkProps } from "@/types";
import { useBlinkDetectionWebSocket } from "@/hooks/useBlinkDetectionWebSocket";
import { extractBase64Data } from "@/utils/imageUtils";

export default function VideoCanvasBlinkWebSocket({
  stream,
  width = 640,
  height = 480,
  isPaused = false,
  onFrameSent,
  onFrameError,
}: VideoCanvasBlinkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Hook para WebSocket de detección de parpadeos
  const {
    sendImage,
    isConnected,
    error: wsError,
  } = useBlinkDetectionWebSocket({
    enabled: !isPaused && stream !== null,
    onBlinkDetection: (response) => {
      // Llamar callback si está disponible
      if (onFrameSent) {
        onFrameSent(response);
      }
    },
  });

  useEffect(() => {
    if (!stream || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    video.srcObject = stream;
    video.play();

    const drawFrame = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // Dibujar el frame del video
        ctx.drawImage(video, 0, 0, width, height);
      }
      requestAnimationFrame(drawFrame);
    };

    video.addEventListener("loadedmetadata", () => {
      canvas.width = width;
      canvas.height = height;
      drawFrame();
    });

    return () => {
      video.srcObject = null;
    };
  }, [stream, width, height]);

  // Efecto para pausar/reanudar el video
  useEffect(() => {
    if (!stream) return;

    const tracks = stream.getVideoTracks();
    tracks.forEach((track) => {
      // Usar enabled en lugar de stop para poder reanudar
      track.enabled = !isPaused;
    });

    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch((err) => {
          console.error("Error al reproducir video:", err);
        });
      }
    }
  }, [isPaused, stream]);

  // Efecto para capturar frames cada 300ms y enviarlos por WebSocket
  useEffect(() => {
    if (!stream || !canvasRef.current || isPaused || !isConnected) {
      // Limpiar intervalo si está pausado, no hay stream o no está conectado
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
      return;
    }

    // Función para capturar frame y enviarlo por WebSocket
    const capturarFrame = () => {
      if (!canvasRef.current || isPaused || !isConnected) return;

      try {
        const canvas = canvasRef.current;
        // Convertir canvas a base64
        const base64Image = canvas.toDataURL("image/jpeg", 0.8);

        // Extraer datos base64 puros (remover prefijo si existe)
        const base64Data = extractBase64Data(base64Image);

        // Enviar al WebSocket para detección de parpadeos
        sendImage(base64Data);
      } catch (error) {
        // Manejar error sin bloquear la captura
        if (onFrameError) {
          onFrameError(
            error instanceof Error ? error : new Error("Error desconocido")
          );
        }
      }
    };

    // Esperar a que el canvas esté listo antes de empezar a capturar
    const checkCanvasReady = () => {
      if (canvasRef.current && canvasRef.current.width > 0 && isConnected) {
        // Iniciar captura cada 300ms
        captureIntervalRef.current = setInterval(() => {
          capturarFrame();
        }, 300);
      } else {
        // Reintentar después de un breve delay
        setTimeout(checkCanvasReady, 100);
      }
    };

    checkCanvasReady();

    // Cleanup: limpiar intervalo al desmontar o cambiar dependencias
    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
    };
  }, [stream, isPaused, isConnected, sendImage, onFrameError]);

  // Efecto para manejar errores del WebSocket
  useEffect(() => {
    if (wsError && onFrameError) {
      onFrameError(wsError);
    }
  }, [wsError, onFrameError]);

  if (!stream) {
    return (
      <div
        className="flex items-center justify-center bg-gray-200 dark:bg-gray-800 rounded-lg w-full max-w-full"
        style={{ maxWidth: `${width}px`, aspectRatio: `${width}/${height}` }}
      >
        <p className="text-gray-500 dark:text-gray-400">
          No hay señal de video disponible
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-full">
      <video ref={videoRef} className="hidden" playsInline muted autoPlay />
      <canvas
        ref={canvasRef}
        className="rounded-lg border-2 border-gray-300 dark:border-gray-700 w-full h-auto max-w-full"
        style={{
          maxWidth: `${width}px`,
          aspectRatio: `${width}/${height}`,
          transform: "scaleX(-1)",
        }}
      />
      {!isConnected && !isPaused && (
        <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs">
          Conectando...
        </div>
      )}
    </div>
  );
}


