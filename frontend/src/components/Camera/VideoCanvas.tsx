"use client";

import { useRef, useEffect } from "react";
import type { VideoCanvasProps } from "@/types";
import { enviarFrameAlBackend } from "@/services/detectionService";

export default function VideoCanvas({
  stream,
  width = 640,
  height = 480,
  isPaused = false,
  onFrameSent,
  onFrameError,
  faceCoordinates,
}: VideoCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

        // Dibujar rectángulo alrededor del rostro solo si está detectado y el video no está pausado
        if (faceCoordinates && !isPaused) {
          const { x, y, w, h } = faceCoordinates;

          // Configurar estilo del rectángulo
          ctx.strokeStyle = "#00ff00"; // Verde
          ctx.lineWidth = 3;
          ctx.setLineDash([]);

          // Dibujar rectángulo (tener en cuenta el flip horizontal del canvas)
          // Como el canvas tiene transform: scaleX(-1), necesitamos ajustar las coordenadas
          const adjustedX = width - x - w;
          ctx.strokeRect(adjustedX, y, w, h);

          // Agregar etiqueta (el texto también se volteará con el canvas, así que ajustamos)
          ctx.save();
          ctx.scale(-1, 1);
          ctx.fillStyle = "#00ff00";
          ctx.font = "16px Arial";
          const textX = -(adjustedX + w / 2);
          const textY = y > 20 ? y - 5 : y + h + 20;
          ctx.textAlign = "center";
          ctx.fillText("Rostro detectado", textX, textY);
          ctx.restore();
        }
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
  }, [stream, width, height, faceCoordinates, isPaused]);

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

  // Efecto para capturar frames cada 300ms
  useEffect(() => {
    if (!stream || !canvasRef.current || isPaused) {
      // Limpiar intervalo si está pausado o no hay stream
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
      return;
    }

    // Función para capturar frame y enviarlo al backend
    const capturarFrame = async () => {
      if (!canvasRef.current || isPaused) return;

      try {
        const canvas = canvasRef.current;
        // Convertir canvas a base64
        const base64Image = canvas.toDataURL("image/jpeg", 0.8);

        console.log("[VideoCanvas] Enviando frame al backend...");

        // Enviar al backend
        const response = await enviarFrameAlBackend(base64Image);

        console.log("[VideoCanvas] Respuesta recibida:", response);

        // Llamar callback si está disponible
        if (onFrameSent) {
          onFrameSent(response);
        }
      } catch (error) {
        console.error("[VideoCanvas] Error capturando frame:", error);
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
      if (canvasRef.current && canvasRef.current.width > 0) {
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
  }, [stream, isPaused, onFrameSent, onFrameError]);

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
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
        autoPlay
      />
      <canvas
        ref={canvasRef}
        className="rounded-lg border-2 border-gray-300 dark:border-gray-700 w-full h-auto max-w-full"
        style={{
          maxWidth: `${width}px`,
          aspectRatio: `${width}/${height}`,
          transform: 'scaleX(-1)'
        }}
      />
    </div>
  );
}

