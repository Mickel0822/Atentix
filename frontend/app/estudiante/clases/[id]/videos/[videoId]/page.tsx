"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/services/api";
import VideoPlayer from "@/components/Video/VideoPlayer";
import { AttentionMonitor, type AttentionMetrics } from "@/components/AttentionMonitor/AttentionMonitor";

interface VideoData {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  videoSummary?: string;
  className: string;
  professor: string;
  duration: string;
}

export default function VerVideoPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  const videoId = params.videoId as string;

  const [videoData, setVideoData] = useState<VideoData | null>(null);

  const [accumulatedAttention, setAccumulatedAttention] = useState<number[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [pausedTime, setPausedTime] = useState(0);
  const [currentPauseElapsed, setCurrentPauseElapsed] = useState(0);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [videoFinished, setVideoFinished] = useState(false);

  const pauseStartTimeRef = useRef<number | null>(null);
  const pausedTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Ref estable para isPlaying (evita recrear handleMetricsUpdate en cada render)
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;

  // Sesión ID y Usuario
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { createClientSupabase } = await import("@/utils/supabase/client");
      const supabase = createClientSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  // Cargar datos del video
  useEffect(() => {
    const fetchData = async () => {
      try {
        const taskRes = await api.get(`/tasks/${videoId}`);
        const task = taskRes.data;
        let className = "Clase";
        const professorName = "Profesor";

        if (task && task.class_id) {
          try {
            const classRes = await api.get(`/classes/${task.class_id}`);
            className = classRes.data.name;
          } catch (err) {
            console.error("Error fetching class info", err);
          }
        }

        setVideoData({
          id: task.id,
          title: task.title,
          description: task.description || "",
          videoUrl: task.video_url,
          videoSummary: task.transcription,
          className: className,
          professor: professorName,
          duration: "10:00",
        });
      } catch (error) {
        console.error("Error fetching video data:", error);
      }
    };

    if (videoId) fetchData();
  }, [videoId]);

  // Manejar inicio de sesión de estudio
  const startSession = async () => {
    try {
      const res = await api.post("/sessions/start", {
        student_id: userId,
        task_id: videoId,
      });
      setSessionId(res.data.session.id);
      console.log("Sesión iniciada:", res.data.session.id);
    } catch (e) {
      console.error("Error iniciando sesión", e);
    }
  };

  // El monitoreo continúa registrando métricas sin alterar la reproducción.
  const handleMetricsUpdate = useCallback((metrics: AttentionMetrics) => {
    if (isPlayingRef.current) {
      const score = metrics.faceDetected ? metrics.score : 0;
      setAccumulatedAttention(prev => [...prev, score]);
    }
  }, []);

  // Handlers de Video Player
  const handlePlayStart = () => {
    setIsPlaying(true);
    if (!sessionId) startSession();
  };

  const handlePlayingChange = (playing: boolean) => {
    if (playing) {
      if (pauseStartTimeRef.current !== null) {
        const elapsed = currentPauseElapsed;
        setPausedTime((prev) => prev + elapsed);
        setCurrentPauseElapsed(0);
        pauseStartTimeRef.current = null;
      }
      if (pausedTimeIntervalRef.current) {
        clearInterval(pausedTimeIntervalRef.current);
        pausedTimeIntervalRef.current = null;
      }
    } else {
      if (pauseStartTimeRef.current === null) {
        pauseStartTimeRef.current = Date.now();
        setCurrentPauseElapsed(0);
      }
      if (!pausedTimeIntervalRef.current) {
        pausedTimeIntervalRef.current = setInterval(() => {
          if (pauseStartTimeRef.current !== null) {
            const elapsed = Math.floor((Date.now() - pauseStartTimeRef.current) / 1000);
            setCurrentPauseElapsed(elapsed);
          }
        }, 1000);
      }
    }
    setIsPlaying(playing);
  };

    // AT-20: el resultado de atención determina si corresponde solicitar retroalimentación.
    // Cuando el video termina naturalmente (onEnded), auto-generar quiz
  const handleFinish = useCallback(async () => {
    if (videoFinished || isGeneratingQuiz) return; // Evitar doble ejecución
    setVideoFinished(true);
    setIsGeneratingQuiz(true);

    // Calcular nivel de atención basado en los datos acumulados
    // AT-19: obtiene el promedio de Engagement Index de toda la reproducción.
    const avgScore = accumulatedAttention.length > 0
      ? accumulatedAttention.reduce((a, b) => a + b, 0) / accumulatedAttention.length
      : 0.5;
    // AT-19: clasifica la atención final antes de cerrar la sesión.
    const level: "alto" | "medio" | "bajo" = avgScore > 0.7 ? "alto" : avgScore > 0.4 ? "medio" : "bajo";

    let activeSessionId = sessionId;
    if (!activeSessionId) {
      try {
        const res = await api.post("/sessions/start", {
          student_id: userId,
          task_id: videoId
        });
        activeSessionId = res.data.session.id;
        setSessionId(activeSessionId);
      } catch (e) {
        console.error("Error starting session:", e);
        setIsGeneratingQuiz(false);
        setVideoFinished(false);
        alert("No se pudo iniciar la sesión.");
        return;
      }
    }

    try {
      // AT-20: la sesión debe conservar el contexto necesario para las respuestas del estudiante.
      const res = await api.post("/sessions/end", {
        session_id: activeSessionId,
        attention_level: level,
      });
      const { quiz_id } = res.data;
      router.push(`/estudiante/cuestionario/${quiz_id}`);
    } catch (error) {
      console.error("Error generating quiz:", error);
      setIsGeneratingQuiz(false);
      setVideoFinished(false);
      alert("Error al generar el cuestionario.");
    }
  }, [videoFinished, isGeneratingQuiz, accumulatedAttention, sessionId, userId, videoId, router]);

  const formatPausedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Cleanup hooks
  useEffect(() => {
    return () => {
      if (pausedTimeIntervalRef.current) clearInterval(pausedTimeIntervalRef.current);
    };
  }, []);

  if (!videoData) return <div className="p-10 text-center text-white">Cargando video...</div>;

  if (isGeneratingQuiz) {
    return (
      <div className="flex flex-col h-screen w-full overflow-hidden bg-white text-[#111318] items-center justify-center">
        <h2 className="text-2xl font-bold mb-4">Generando Cuestionario...</h2>
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background-light text-[#111318]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-3 bg-white z-20 h-16 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-[#616f89]">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-base font-bold text-[#111318]">{videoData.title}</h2>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push(`/estudiante/clases/${classId}/videos`)} className="text-[#616f89] hover:bg-gray-100 p-2 rounded-full">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden relative">

        {/* Video Player */}
        <VideoPlayer
          videoUrl={videoData.videoUrl}
          onFinish={handleFinish}
          onPlayStart={handlePlayStart}
          onPlayingChange={handlePlayingChange}
        />

        {/* Sidebar */}
        <aside className="w-80 bg-white border-l border-[#e5e7eb] flex flex-col shrink-0 z-20 h-full overflow-y-auto">
          {/* Monitor de Atención Integrado */}
          <div className="p-4 border-b border-[#e5e7eb]">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Monitor de Atención</h3>
            {videoFinished ? (
              <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-sm text-gray-500">Sesión Finalizada</p>
              </div>
            ) : (
              <AttentionMonitor
                className="w-full"
                onMetricsUpdate={handleMetricsUpdate}
                showDebugInfo={false}
              />
            )}
          </div>

          {/* Info Video */}
          <div className="p-4 flex-1">
            <h3 className="text-lg font-bold mb-2">{videoData.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{videoData.description}</p>

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 mb-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Tiempo en pausa:</span>
                <span className="font-bold">{formatPausedTime(pausedTime + currentPauseElapsed)}</span>
              </div>
            </div>
          </div>
        </aside>
      </main>


    </div>
  );
}
