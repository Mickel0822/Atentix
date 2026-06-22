"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Admin/Header";
import Link from "next/link";
import api from "@/services/api";
import { EditVideoModal, Video } from "@/components/Profesor/VideoModals";

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("Todas las clases");

  // Estado para modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tasks/professor/me");
      setVideos(res.data);
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm("¿Estás seguro de eliminar este video?")) return;
    try {
      await api.delete(`/tasks/${videoId}`);
      setVideos(videos.filter((v) => v.id !== videoId));
    } catch (error) {
      console.error("Delete failed", error);
      alert("No se pudo eliminar el video");
    }
  };

  const handleEditVideo = (video: Video) => {
    setSelectedVideo(video);
    setIsEditModalOpen(true);
  };

  const handleSaveVideo = async (videoData: Partial<Video>) => {
    if (!selectedVideo) return;
    try {
      await api.put(`/tasks/${selectedVideo.id}`, {
        title: videoData.title,
        description: videoData.description,
        class_id: videoData.class_id,
        inicio_habilitado: videoData.inicio_habilitado,
        is_active: videoData.is_active,
      });

      // Recargar videos para ver cambios reflejados (ej. cambio de clase)
      fetchVideos();
      setIsEditModalOpen(false);
      setSelectedVideo(null);
    } catch (error) {
      console.error("Error updating video", error);
      alert("Error al actualizar el video");
    }
  };

  // Obtener lista única de clases para el filtro
  const uniqueClasses = ["Todas las clases", ...Array.from(new Set(videos.map(v => v.class_name || "Sin clase")))];

  const filteredVideos = videos.filter((video) => {
    const matchesClass =
      selectedClassFilter === "Todas las clases" || (video.class_name || "Sin clase") === selectedClassFilter;
    const matchesSearch =
      video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (video.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const formatDuration = (seconds: number) => {
    if (!seconds) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Desconocida";
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  return (
    <>
      <Header
        title="Lista de Videos"
        subtitle="Gestiona tus videos, clases y evaluaciones"
      />

      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8 pt-0">
        {/* Filters & Actions */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#616f89]">
                <span className="material-symbols-outlined">search</span>
              </span>
              <input
                className="w-full bg-white border border-[#dbdfe6] rounded-lg py-2.5 pl-9 pr-3 text-sm focus:ring-primary focus:border-primary placeholder:text-[#616f89] text-[#111318]"
                placeholder="Buscar por título o descripción..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative min-w-[200px]">
              <select
                className="appearance-none flex w-full rounded-lg text-[#111318] focus:outline-none focus:ring-2 focus:ring-primary border border-[#dbdfe6] bg-white h-10 px-4 pr-10 text-sm cursor-pointer"
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
              >
                {uniqueClasses.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#616f89]">
                <span className="material-symbols-outlined text-[20px]">
                  expand_more
                </span>
              </span>
            </div>
          </div>

          <Link
            href="/profesor/subir-video"
            className="w-full md:w-auto px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
          >
            <span className="material-symbols-outlined">add</span>
            Nuevo Video
          </Link>
        </div>

        {/* Videos List */}
        {loading ? (
          <div className="text-center py-10 text-gray-500">Cargando videos...</div>
        ) : (
          <div className="space-y-4">
            {filteredVideos.length === 0 ? (
              <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                No se encontraron videos.
              </div>
            ) : (
              filteredVideos.map((video) => (
                <div
                  key={video.id}
                  className="bg-white rounded-xl border border-[#e5e7eb] p-6 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Video Thumbnail */}
                    <div className="relative w-full md:w-48 h-32 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-200"></div>
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <span className="material-symbols-outlined text-white text-4xl">
                          play_circle
                        </span>
                      </div>
                      <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {formatDuration(video.duration_seconds)}
                      </span>
                    </div>
                    {/* Video Info */}
                    <div className="flex-1 flex flex-col gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-[#111318] mb-2 group-hover:text-primary transition-colors">
                          {video.title}
                        </h3>
                        <p className="text-sm text-[#616f89] mb-3 line-clamp-2">{video.description}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#616f89] text-[18px]">
                            class
                          </span>
                          <span className="text-[#616f89]">
                            Clase: <strong className="text-[#111318]">{video.class_name}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#616f89] text-[18px]">
                            quiz
                          </span>
                          <span className="text-[#616f89]">
                            Evaluación: <strong className="text-[#111318]">
                              {video.questions_count || 5} preguntas
                            </strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#616f89] text-[18px]">
                            calendar_today
                          </span>
                          <span className="text-[#616f89]">
                            Publicado: {formatDate(video.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold border ${video.is_active
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-red-50 text-red-700 border-red-200"
                              }`}
                          >
                            {video.is_active && (
                              <span className="size-1.5 rounded-full bg-green-500 inline-block mr-1"></span>
                            )}
                            {video.is_active ? "Publicado" : "Inactivo"}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-start gap-2">
                      <button
                        className="p-2 rounded-lg text-[#616f89] hover:bg-gray-100 transition-colors"
                        title="Editar"
                        onClick={() => handleEditVideo(video)}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          edit
                        </span>
                      </button>
                      <button
                        className="p-2 rounded-lg text-[#616f89] hover:bg-gray-100 transition-colors"
                        title="Eliminar"
                        onClick={() => handleDeleteVideo(video.id)}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          delete
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        <EditVideoModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          video={selectedVideo}
          onSave={handleSaveVideo}
        />
      </div>
    </>
  );
}

