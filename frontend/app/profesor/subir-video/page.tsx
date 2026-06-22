"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Admin/Header";
import api from "@/services/api";

// Mock data - En producción esto vendría de una API
const mockClasses = [
  { id: "1", name: "Matemáticas 101" },
  { id: "2", name: "Historia Universal" },
  { id: "3", name: "Química Orgánica" },
];

export default function SubirVideoPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    classId: "",
    startDate: "",
    endDate: "",
    numberOfQuestions: 10,
  });

  // Estados nuevos para la integración
  const [classes, setClasses] = useState<{ id: string, name: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Cargar clases reales al montar el componente
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        // En producción, esto debería usar el auth token
        const response = await api.get('/classes/');
        setClasses(response.data);
      } catch (error) {
        console.error("Error cargando clases:", error);
      }
    };
    fetchClasses();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Obtener duración del video
      try {
        const videoUrl = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(videoUrl);
          const duration = Math.floor(video.duration);
          setDurationSeconds(duration);
        };
        
        video.onerror = () => {
          window.URL.revokeObjectURL(videoUrl);
          console.error("Error cargando metadatos del video");
          setDurationSeconds(null);
        };
        
        video.src = videoUrl;
      } catch (error) {
        console.error("Error obteniendo duración del video:", error);
        setDurationSeconds(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Por favor selecciona un video");
      return;
    }

    setIsLoading(true);
    setUploadError(null);

    try {
      // Crear FormData para enviar archivo + datos
      const data = new FormData();
      data.append("class_id", formData.classId);
      data.append("title", formData.title);
      data.append("description", formData.description);
      data.append("questions_count", formData.numberOfQuestions.toString());
      data.append("video", selectedFile);

      // Agregar fechas de disponibilidad si se proporcionaron
      if (formData.startDate) {
        // Convertir datetime-local a ISO string
        const startDateISO = new Date(formData.startDate).toISOString();
        data.append("inicio_habilitado", startDateISO);
      }
      if (formData.endDate) {
        // Convertir datetime-local a ISO string
        const endDateISO = new Date(formData.endDate).toISOString();
        data.append("fin_habilitado", endDateISO);
      }
      
      // Agregar duración del video si se obtuvo
      if (durationSeconds !== null) {
        data.append("duration_seconds", durationSeconds.toString());
      }
      
      // Agregar is_active (por defecto true)
      data.append("is_active", "true");

      await api.post('/tasks/upload', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setIsSuccessModalOpen(true);
    } catch (error) {
      console.error("Error subiendo video:", error);
      setUploadError("Hubo un error al subir el video. Asegúrate que el backend esté corriendo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = () => {
    setIsSuccessModalOpen(false);
    router.push("/profesor");
  };

  return (
    <>
      <Header
        title="Gestión de Videos"
        subtitle="Sube videos y configura su disponibilidad"
        user={{
          name: "Prof. Carlos Ruiz",
          email: "carlos.ruiz@edu.com",
          role: "Profesor",
        }}
      />
      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
        <div className="flex flex-col gap-6">
          {/* Nota informativa */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-blue-600 text-xl">
              info
            </span>
            <div className="flex-1">
              <p className="text-sm text-blue-900 font-medium">
                Nota: El cuestionario se creará automáticamente por IA (Gemini) analizando el contenido del video.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Upload Dropzone */}
            <div className="lg:col-span-4 flex flex-col">
              <div className="bg-white rounded-xl shadow-sm border border-[#e5e7eb] p-6 flex-1 flex flex-col">
                <h3 className="text-[#111318] text-lg font-bold mb-4">
                  Subir Nuevo Video
                </h3>

                {/* File Input Area */}
                <div className="flex flex-col items-center justify-center gap-6 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 px-6 flex-1 transition-colors hover:bg-primary/10 group cursor-pointer relative overflow-hidden">
                  <input
                    type="file"
                    accept="video/mp4,video/x-m4v,video/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />

                  <div className="flex flex-col items-center gap-2 text-center pointer-events-none">
                    <div className="size-14 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-2 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-3xl">
                        {selectedFile ? 'movie' : 'cloud_upload'}
                      </span>
                    </div>

                    {selectedFile ? (
                      <div>
                        <p className="text-[#111318] text-base font-bold leading-tight break-all">
                          {selectedFile.name}
                        </p>
                        <p className="text-[#616f89] text-sm font-normal mt-1">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-[#111318] text-base font-bold leading-tight">
                          Arrastra tu video aquí
                        </p>
                        <p className="text-[#616f89] text-sm font-normal">
                          Soporta MP4, MOV, AVI (Max 2GB)
                        </p>
                      </>
                    )}
                  </div>

                  {!selectedFile && (
                    <button
                      type="button"
                      className="flex items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-white border border-[#dbdfe6] text-[#111318] text-sm font-bold shadow-sm hover:shadow transition-shadow pointer-events-none"
                    >
                      <span className="truncate">Seleccionar Archivo</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Configuration Form */}
            <div className="lg:col-span-8">
              <div className="bg-white rounded-xl shadow-sm border border-[#e5e7eb] p-6 h-full">
                <h3 className="text-[#111318] text-lg font-bold mb-4 border-b border-[#e5e7eb] pb-2">
                  Configuración del Video
                </h3>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <label className="flex flex-col gap-2">
                    <span className="text-[#111318] text-sm font-medium">
                      Título del Video
                    </span>
                    <input
                      className="w-full rounded-lg border border-[#dbdfe6] bg-white text-[#111318] h-12 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-[#616f89]"
                      placeholder="Ej: Introducción al Álgebra Lineal"
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-[#111318] text-sm font-medium">
                      Descripción
                    </span>
                    <textarea
                      className="w-full rounded-lg border border-[#dbdfe6] bg-white text-[#111318] min-h-[100px] p-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none placeholder:text-[#616f89]"
                      placeholder="Describe el contenido del video..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-[#111318] text-sm font-medium">
                      Clase Asociada
                    </span>
                    <select
                      className="w-full rounded-lg border border-[#dbdfe6] bg-white text-[#111318] h-12 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary appearance-none cursor-pointer"
                      required
                      value={formData.classId}
                      onChange={(e) =>
                        setFormData({ ...formData, classId: e.target.value })
                      }
                    >
                      <option value="">Seleccionar clase</option>
                      {classes.map((classItem) => (
                        <option key={classItem.id} value={classItem.id}>
                          {classItem.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Fechas de disponibilidad */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex flex-col gap-2">
                      <span className="text-[#111318] text-sm font-medium">
                        Fecha de Inicio
                      </span>
                      <input
                        type="datetime-local"
                        className="w-full rounded-lg border border-[#dbdfe6] bg-white text-[#111318] h-12 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        value={formData.startDate}
                        onChange={(e) =>
                          setFormData({ ...formData, startDate: e.target.value })
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-[#111318] text-sm font-medium">
                        Fecha de Fin
                      </span>
                      <input
                        type="datetime-local"
                        className="w-full rounded-lg border border-[#dbdfe6] bg-white text-[#111318] h-12 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        value={formData.endDate}
                        onChange={(e) =>
                          setFormData({ ...formData, endDate: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  
                  {/* Duración del video y número de preguntas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex flex-col gap-2">
                      <span className="text-[#111318] text-sm font-medium">
                        Duración del Video
                      </span>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-[#dbdfe6] bg-gray-50 text-[#111318] h-12 px-4 focus:outline-none transition-all"
                        value={durationSeconds !== null ? (() => {
                          const hours = Math.floor(durationSeconds / 3600);
                          const minutes = Math.floor((durationSeconds % 3600) / 60);
                          const seconds = durationSeconds % 60;
                          if (hours > 0) {
                            return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                          }
                          return `${minutes}:${String(seconds).padStart(2, '0')}`;
                        })() : "Se calculará automáticamente"}
                        disabled
                        readOnly
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-[#111318] text-sm font-medium">
                        Número de Preguntas
                      </span>
                      <select
                        className="w-full rounded-lg border border-[#dbdfe6] bg-white text-[#111318] h-12 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary appearance-none cursor-pointer"
                        value={formData.numberOfQuestions}
                        onChange={(e) => setFormData({ ...formData, numberOfQuestions: Number(e.target.value) })}
                      >
                        <option value={5}>5 preguntas</option>
                        <option value={10}>10 preguntas</option>
                        <option value={15}>15 preguntas</option>
                        <option value={20}>20 preguntas</option>
                      </select>
                    </label>
                  </div>

                  {uploadError && (
                    <div className="text-red-600 text-sm font-medium p-2 bg-red-50 rounded">
                      {uploadError}
                    </div>
                  )}

                  <div className="flex gap-3 justify-end pt-4 border-t border-[#e5e7eb]">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`px-5 py-2.5 rounded-lg text-white font-medium transition-colors flex items-center gap-2 ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-blue-700'
                        }`}
                    >
                      {isLoading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                      {isLoading ? 'Subiendo video y generando resumen (puede tardar varios minutos)...' : 'Subir Video'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de éxito */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
                  <span className="material-symbols-outlined text-green-600 text-2xl">
                    check_circle
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#111318]">
                    Video Subido Exitosamente
                  </h2>
                </div>
              </div>
              <p className="text-[#616f89] mb-6">
                El video ha sido subido y el resumen generado correctamente. La IA generará el cuestionario automáticamente cuando el estudiante complete la sesión.
              </p>
              <div className="flex justify-end">
                <button
                  onClick={handleAccept}
                  className="px-5 py-2.5 rounded-lg bg-primary hover:bg-blue-700 text-white font-medium transition-colors"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

