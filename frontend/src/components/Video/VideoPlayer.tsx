"use client";

import { useState, useRef, useEffect } from "react";

interface VideoPlayerProps {
  videoUrl: string;
  attentionLevel: "Alto" | "Medio" | "Bajo";
  faceDetected: boolean;
  attentionMessage: string;
  showAttentionAlert: boolean;
  onFinish: () => void;
  onPlayStart?: () => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  onDurationChange?: (duration: number) => void;
}

export default function VideoPlayer({
  videoUrl,
  attentionLevel,
  faceDetected,
  attentionMessage,
  showAttentionAlert,
  onFinish,
  onPlayStart,
  onPlayingChange,
  onDurationChange,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wasPausedByAbsenceRef = useRef(false);

  // Control automático de velocidad basado en atención
  useEffect(() => {
    if (!videoRef.current || !isVideoReady) return;

    // Si no hay persona detectada y el video está reproduciéndose, pausar automáticamente
    if (!faceDetected && isPlaying) {
      console.log("[VideoPlayer] Pausando video automáticamente - persona ausente");
      videoRef.current.pause();
      setIsPlaying(false);
      wasPausedByAbsenceRef.current = true;
      if (onPlayingChange) {
        onPlayingChange(false);
      }
    }

    // Control de velocidad basado en nivel de atención
    let targetRate: number;
    if (attentionLevel === "Alto") {
      targetRate = 1.0; // Velocidad normal
    } else if (attentionLevel === "Medio" || attentionLevel === "Bajo") {
      targetRate = 0.5; // Ralentizar
    } else {
      targetRate = 1.0;
    }

    // Solo cambiar velocidad si el video está reproduciéndose y hay persona presente
    if (isPlaying && faceDetected && videoRef.current.playbackRate !== targetRate) {
      videoRef.current.playbackRate = targetRate;
      // Solo actualizar estado si realmente cambió (evitar re-render)
      setPlaybackRate(prev => prev === targetRate ? prev : targetRate);
      console.log(`[VideoPlayer] Velocidad cambiada a ${targetRate}x (Nivel: ${attentionLevel})`);
    }
  }, [attentionLevel, faceDetected, isPlaying, isVideoReady]);

  // Resetear flag cuando la persona vuelve
  useEffect(() => {
    if (faceDetected) {
      wasPausedByAbsenceRef.current = false;
    }
  }, [faceDetected]);

  const handlePlayPause = async () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      // Pausar el video
      videoRef.current.pause();
      setIsPlaying(false);
      wasPausedByAbsenceRef.current = false; // Resetear flag si el usuario pausa manualmente
      if (onPlayingChange) {
        onPlayingChange(false);
      }
      // Cancelar cualquier promesa de reproducción pendiente
      if (playPromiseRef.current) {
        try {
          await playPromiseRef.current;
        } catch {
          // Ignorar errores de cancelación
        }
        playPromiseRef.current = null;
      }
    } else {
      // Reproducir el video
      if (!isVideoReady) {
        console.log("Video aún no está listo para reproducir");
        return;
      }

      // Si no hay persona presente, no permitir reproducir
      if (!faceDetected) {
        console.log("No se puede reproducir - persona ausente");
        return;
      }

      try {
        // Cancelar cualquier reproducción anterior pendiente
        if (playPromiseRef.current) {
          try {
            await playPromiseRef.current;
          } catch {
            // Ignorar errores de cancelación
          }
        }

        // Aplicar velocidad según nivel de atención
        let targetRate: number;
        if (attentionLevel === "Alto") {
          targetRate = 1.0;
        } else if (attentionLevel === "Medio" || attentionLevel === "Bajo") {
          targetRate = 0.5;
        } else {
          targetRate = 1.0;
        }
        videoRef.current.playbackRate = targetRate;
        setPlaybackRate(targetRate);

        // Intentar reproducir
        playPromiseRef.current = videoRef.current.play();
        await playPromiseRef.current;
        setIsPlaying(true);
        wasPausedByAbsenceRef.current = false;
        if (onPlayStart) {
          onPlayStart();
        }
        if (onPlayingChange) {
          onPlayingChange(true);
        }
        playPromiseRef.current = null;
      } catch (error: unknown) {
        // Manejar errores de reproducción
        const err = error as { name?: string; message?: string };
        if (err.name === "AbortError") {
          console.log("Reproducción cancelada (nuevo video cargándose)");
        } else if (err.name === "NotAllowedError") {
          console.error(
            "Reproducción bloqueada por el navegador (autoplay policy)"
          );
          alert(
            "Por favor, haz clic en el video para permitir la reproducción"
          );
        } else {
          console.error("Error al reproducir el video:", err);
        }
        setIsPlaying(false);
        if (onPlayingChange) {
          onPlayingChange(false);
        }
        playPromiseRef.current = null;
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const newTime = videoRef.current.currentTime;
      // Solo actualizar si cambió más de 0.25s (evitar re-renders excesivos)
      setCurrentTime(prev => Math.abs(prev - newTime) > 0.25 ? newTime : prev);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      setIsVideoReady(true);
      if (onDurationChange) {
        onDurationChange(videoDuration);
      }
    }
  };

  const handleCanPlay = () => {
    setIsVideoReady(true);
  };

  const handleLoadStart = () => {
    setIsVideoReady(false);
    setIsPlaying(false);
    // Cancelar cualquier reproducción pendiente
    if (playPromiseRef.current) {
      playPromiseRef.current.catch(() => {
        // Ignorar errores de cancelación
      });
      playPromiseRef.current = null;
    }
  };

  const handleVideoError = (
    e: React.SyntheticEvent<HTMLVideoElement, Event>
  ) => {
    console.error("Error en el video:", e);
    setIsVideoReady(false);
    setIsPlaying(false);
    if (onPlayingChange) {
      onPlayingChange(false);
    }
    if (playPromiseRef.current) {
      playPromiseRef.current.catch(() => {
        // Ignorar errores
      });
      playPromiseRef.current = null;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = (parseFloat(e.target.value) / 100) * duration;
      // Solo permitir retroceder, no adelantar
      if (newTime <= videoRef.current.currentTime) {
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current?.requestFullscreen)
      videoRef.current.requestFullscreen();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
      if (playPromiseRef.current) {
        playPromiseRef.current.catch(() => { });
        playPromiseRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, []);

  return (
    <div
      id="video-container"
      className="flex-1 flex flex-col relative bg-black justify-center items-center group/player"
      onMouseEnter={() => {
        setShowControls(true);
        // Limpiar timer si existe
        if (hideControlsTimerRef.current) {
          clearTimeout(hideControlsTimerRef.current);
          hideControlsTimerRef.current = null;
        }
      }}
      onMouseLeave={() => {
        if (isPlaying) {
          // Limpiar timer anterior si existe
          if (hideControlsTimerRef.current) {
            clearTimeout(hideControlsTimerRef.current);
          }
          hideControlsTimerRef.current = setTimeout(() => {
            setShowControls(false);
            hideControlsTimerRef.current = null;
          }, 2000);
        }
      }}
    >
      {/* Video Container */}
      <div className="w-full h-full relative overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={handleCanPlay}
          onLoadStart={handleLoadStart}
          onError={handleVideoError}
          onEnded={onFinish}
          onClick={handlePlayPause}
          preload="metadata"
        />

        {/* Attention Level Indicator */}
        <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
          <div
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-300 ${attentionLevel === "Alto"
              ? "bg-green-100 text-green-700 border border-green-200"
              : attentionLevel === "Medio"
                ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                : "bg-red-100 text-red-700 border border-red-200 animate-pulse"
              }`}
          >
            <span className="material-symbols-outlined text-sm">
              {attentionLevel === "Alto"
                ? "visibility"
                : attentionLevel === "Medio"
                  ? "visibility_off"
                  : "warning"}
            </span>
            <span>Atención: {attentionLevel}</span>
          </div>

          {/* Mensaje dinámico */}
          <div
            className={`px-3 py-1.5 rounded-lg text-xs font-medium bg-black/70 text-white backdrop-blur-sm transition-all duration-300`}
          >
            {attentionMessage}
          </div>
        </div>

        {/* Alerta de baja atención - Overlay animado */}
        {showAttentionAlert && isPlaying && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
            <div className="animate-pulse bg-red-500/20 rounded-2xl p-8 backdrop-blur-sm border-2 border-red-500/50">
              <div className="flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-5xl text-red-500 animate-bounce">
                  warning
                </span>
                <p className="text-xl font-bold text-white text-center drop-shadow-lg">
                  ¡Atención requerida!
                </p>
                <p className="text-sm text-white/80 text-center">
                  Vuelve a enfocarte en el video
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Video Controls Overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/60 transition-opacity duration-300 flex flex-col justify-end p-6 z-10 ${showControls || !isPlaying ? "opacity-100" : "opacity-0"
            }`}
        >
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-white/20 rounded-full mb-4 cursor-pointer relative group/progress">
            <div
              className="absolute top-0 left-0 h-full bg-primary rounded-full relative"
              style={{
                width: `${duration > 0 ? (currentTime / duration) * 100 : 0
                  }%`,
              }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover/progress:scale-100 transition-transform shadow-md"></div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={duration > 0 ? (currentTime / duration) * 100 : 0}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-6">
              <button
                onClick={handlePlayPause}
                className="hover:text-primary transition-colors"
                disabled={!faceDetected && !isPlaying}
                title={!faceDetected && !isPlaying ? "Persona ausente - Vuelve a la cámara" : ""}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "32px" }}
                >
                  {isPlaying ? "pause_circle" : "play_circle"}
                </span>
              </button>
              <div className="flex items-center gap-2 group/volume">
                <button className="hover:text-primary transition-colors">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "24px" }}
                  >
                    {volume > 0 ? "volume_up" : "volume_off"}
                  </span>
                </button>
                <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-300 ease-out">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="h-1 bg-white/30 rounded-full w-16 ml-2 accent-white"
                  />
                </div>
              </div>
              <span className="text-sm font-medium tracking-wide">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <div className="flex items-center gap-4">
              {/* Velocidad controlada automáticamente por atención */}
              <span
                className="px-2 py-1 bg-white/10 rounded text-xs font-bold tracking-wider"
                title="Velocidad automática basada en nivel de atención"
              >
                {playbackRate}x
              </span>
              <button className="hover:text-primary transition-colors">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "24px" }}
                >
                  closed_caption
                </span>
              </button>
              <button
                onClick={handleFullscreen}
                className="hover:text-primary transition-colors"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "24px" }}
                >
                  fullscreen
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

