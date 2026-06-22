"use client";

import { useState, useRef, useCallback } from "react";
import type { FaceDetectionResponse } from "@/types/detection";

export interface FaceDetectionState {
  detected: boolean;
  coordinates: { x: number; y: number; w: number; h: number } | null;
  confidence: number;
  fps: number;
}

/**
 * Hook para manejar el estado de detección de rostro y calcular FPS
 */
export function useFaceDetection() {
  const [detectionState, setDetectionState] = useState<FaceDetectionState>({
    detected: false,
    coordinates: null,
    confidence: 0,
    fps: 0,
  });

  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef<number>(0);
  const fpsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Función para actualizar el estado de detección
  const updateDetection = useCallback((response: FaceDetectionResponse) => {
    setDetectionState((prev) => ({
      detected: response.detected,
      coordinates: response.coordinates,
      confidence: response.confidence,
      fps: prev.fps, // Mantener FPS mientras se actualiza
    }));

    // Incrementar contador de frames
    frameCountRef.current += 1;
  }, []);

  // Calcular FPS cada segundo
  const calculateFPS = useCallback(() => {
    const now = Date.now();
    const elapsed = (now - lastFpsUpdateRef.current) / 1000; // en segundos

    if (elapsed >= 1) {
      const fps = Math.round(frameCountRef.current / elapsed);
      setDetectionState((prev) => ({
        ...prev,
        fps,
      }));

      // Resetear contadores
      frameCountRef.current = 0;
      lastFpsUpdateRef.current = now;
    }
  }, []);

  // Iniciar cálculo de FPS
  const startFpsCalculation = useCallback(() => {
    if (fpsIntervalRef.current) {
      clearInterval(fpsIntervalRef.current);
    }

    // Resetear contadores al iniciar
    frameCountRef.current = 0;
    lastFpsUpdateRef.current = Date.now();

    fpsIntervalRef.current = setInterval(() => {
      calculateFPS();
    }, 1000); // Actualizar cada segundo
  }, [calculateFPS]);

  // Detener cálculo de FPS
  const stopFpsCalculation = useCallback(() => {
    if (fpsIntervalRef.current) {
      clearInterval(fpsIntervalRef.current);
      fpsIntervalRef.current = null;
    }
    // Resetear FPS cuando se detiene
    setDetectionState((prev) => ({
      ...prev,
      fps: 0,
    }));
    frameCountRef.current = 0;
  }, []);

  return {
    detectionState,
    updateDetection,
    startFpsCalculation,
    stopFpsCalculation,
  };
}
