"use client";

import { useState, useEffect, useRef } from "react";
import type { CameraState } from "@/types";

export function useCamera() {
  const [cameraState, setCameraState] = useState<CameraState>({
    stream: null,
    isLoading: true,
    error: null,
  });

  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });

        if (isMounted) {
          streamRef.current = stream;
          setCameraState({
            stream,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        if (isMounted) {
          setCameraState({
            stream: null,
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : "Error al acceder a la cámara",
          });
        }
      }
    };

    initializeCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return cameraState;
}

