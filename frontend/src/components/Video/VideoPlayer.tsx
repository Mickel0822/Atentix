"use client";

import { useState, useRef, useEffect } from "react";

interface VideoPlayerProps {
  videoUrl: string;
  onFinish: () => void;
  onPlayStart?: () => void;
  onPlayingChange?: (isPlaying: boolean) => void;
}

export default function VideoPlayer({
  videoUrl,
  onFinish,
  onPlayStart,
  onPlayingChange,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [volume, setVolume] = useState(1);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePlayPause = async () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      // Pausar el video
      videoRef.current.pause();
      setIsPlaying(false);
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

      try {
        // Cancelar cualquier reproducción anterior pendiente
        if (playPromiseRef.current) {
          try {
            await playPromiseRef.current;
          } catch {
            // Ignorar errores de cancelación
          }
        }

        videoRef.current.playbackRate = 1;

        // Intentar reproducir
        playPromiseRef.current = videoRef.current.play();
        await playPromiseRef.current;
        setIsPlaying(true);
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

