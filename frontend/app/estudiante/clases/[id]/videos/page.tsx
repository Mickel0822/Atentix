"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Admin/Header";
import Link from "next/link";
import api from "@/services/api";

export default function VideosClasePage() {
  const params = useParams();
  const router = useRouter();
  // En Next.js App Router con 'use client', useParams() puede devolver un objeto vacío inicialmente
  // o undefined durante el renderizado del servidor si no se maneja bien.
  // Aseguramos que classId sea string o '' para evitar errores.
  const classId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : "";

  const [activeTab, setActiveTab] = useState<"videos" | "resultados">("videos");

  const [loading, setLoading] = useState(true);
  const [classInfo, setClassInfo] = useState<any>({ name: "Cargando...", professor: "...", description: "" });
  const [videos, setVideos] = useState<any[]>([]);

  // Fetch Class & Videos
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Get Class Info
        const classRes = await api.get(`/classes/${classId}`);
        if (classRes.data) {
          setClassInfo({
            name: classRes.data.name,
            professor: "Profesor", // Placeholder: Backend debería enviar profesor
            description: classRes.data.description
          });
        }

        // 2. Get Videos (Tasks)
        const tasksRes = await api.get(`/tasks/student/class/${classId}`);
        if (tasksRes.data) {
          // Transformar tasks a formato UI
          const mappedVideos = tasksRes.data.map((task: any) => {
            // Formatear duración seg -> min:seg
            const durSec = task.duration_seconds || 0;
            const mins = Math.floor(durSec / 60);
            const secs = durSec % 60;
            const durationStr = `${mins}:${secs.toString().padStart(2, '0')}`;

            return {
              id: task.id,
              title: task.title,
              description: task.description || "Sin descripción",
              duration: durationStr,
              uploadDate: task.created_at || new Date().toISOString(),
              watched: task.watched,
              available: task.is_active !== false, // Si es nulo asumo activo
              videoUrl: task.video_url
            };
          });
          setVideos(mappedVideos);
        }
      } catch (error) {
        console.error("Error fetching class data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (classId) {
      fetchData();
    }
  }, [classId]);

  // Mock data para resultados (mantenido por ahora)
  const mockVideoResults = [
    {
      videoId: "1",
      videoTitle: "Introducción a las Derivadas",
      score: 85,
      correctAnswers: 17,
      incorrectAnswers: 3,
      totalQuestions: 20,
      attentionLevel: "Alto" as "Alto" | "Medio" | "Bajo",
      date: "2024-01-20",
      resultId: "1",
    },
    // ... más datos mock si se desea
  ];

  const getAttentionBadgeColor = (level: "Alto" | "Medio" | "Bajo") => {
    if (level === "Alto")
      return "bg-green-100 text-green-700 border-green-200";
    if (level === "Medio")
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    return "text-orange-600";
  };

  return (
    <>
      <Header
        title={classInfo.name}
        subtitle={classInfo.professor}
        user={{
          name: "Estudiante",
          email: "estudiante@demo.com",
          role: "Estudiante",
        }}
      />
      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#616f89] hover:text-[#111318] transition-colors self-start"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span>Volver a Mis Clases</span>
        </button>

        {/* Class Info */}
        {/* Opcional: Si el usuario quiere simplificar más, podríamos quitar esto, pero la imagen muestra solo título de la sección. 
            El usuario dijo "asi es el diseño debes eliminar el apartado de resultados". 
            Mantendré la info de la clase por contexto, pero si la imagen no lo tiene... 
            La imagen muestra "Videos de la Clase". 
            Mantendré la info de clase arriba como header contextual.
        */}

        {/* Lista de Videos */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-[#111318]">
            Videos de la Clase
          </h2>

          {loading ? (
            <div className="flex justify-center p-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white border-b border-[#e5e7eb] text-xs uppercase tracking-wider text-[#616f89] font-bold">
                      <th className="px-6 py-4 text-left">Video</th>
                      <th className="px-6 py-4 text-center">Duración</th>
                      <th className="px-6 py-4 text-center">Estado</th>
                      <th className="px-6 py-4 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e7eb]">
                    {videos.map((video) => (
                      <tr
                        key={video.id}
                        className="group hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-start gap-4">
                            {/* Thumbnail / Icon placeholder */}
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${video.watched ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                              <span className="material-symbols-outlined text-[24px]">
                                {video.watched ? 'check_circle' : 'play_circle'}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-[#111318] mb-1">
                                {video.title}
                              </h3>
                              <p className="text-sm text-[#616f89] line-clamp-2 max-w-md">
                                {video.description}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="text-sm font-medium text-[#616f89]">
                            {video.duration} min
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${video.watched
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-orange-50 text-orange-700 border-orange-200"
                              }`}
                          >
                            {video.watched ? "Visto" : "Pendiente"}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <Link
                            href={`/estudiante/clases/${classId}/videos/${video.id}`}
                            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${video.watched
                              ? "bg-gray-100 text-[#616f89] hover:bg-gray-200"
                              : "bg-primary text-white hover:bg-blue-700 shadow-md shadow-primary/20"
                              }`}
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              {video.watched ? 'replay' : 'play_arrow'}
                            </span>
                            {video.watched ? "Ver de Nuevo" : "Ver Video"}
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {videos.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-4xl text-gray-300">
                              videocam_off
                            </span>
                            <p>No hay videos disponibles en esta clase.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
