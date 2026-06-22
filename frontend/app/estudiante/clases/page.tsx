"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Admin/Header";
import Link from "next/link";
import Image from "next/image";
import api from "@/services/api";
import { getErrorMessage } from "@/services/error";

export default function MisClasesPage() {
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [accessCode, setAccessCode] = useState("");

  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/classes/');
      setClasses(res.data);
    } catch (err) {
      console.error("Error fetching classes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post('/classes/join', { code: accessCode });
      setIsJoinModalOpen(false);
      setAccessCode("");
      // Recargar clases
      fetchClasses();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Error al unirse a la clase";
      setError(msg);
    }
  };

  return (
    <>
      <Header
        title="Mis Clases"
        subtitle="Selecciona una clase para ver sus videos"
      />
      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-[#111318]">Mis Clases</h1>
            <p className="text-[#616f89]">
              Gestiona tus clases y accede a los materiales
            </p>
          </div>
          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-primary/30"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            <span>Unirse a Clase</span>
          </button>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-3 text-center py-10 text-gray-500">Cargando clases...</div>
          ) : classes.length === 0 ? (
            <div className="col-span-3 text-center py-10 text-gray-500 border border-dashed rounded-xl">
              No estás inscrito en ninguna clase aún. Usa el botón "Unirse a Clase" para agregar una.
            </div>
          ) : (
            classes.map((classItem) => (
              <Link
                key={classItem.id}
                href={`/estudiante/clases/${classItem.id}/videos`}
                className="flex flex-col bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden hover:shadow-md transition-shadow group cursor-pointer h-full"
              >
                {/* Header con Imagen/Gradiente */}
                <div className="relative h-32 w-full bg-cover bg-center" style={{
                  backgroundImage: classItem.imageUrl ? `url(${classItem.imageUrl})` : 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)'
                }}>
                  {!classItem.imageUrl && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-40">
                      <span className="material-symbols-outlined text-[60px] text-[#6366f1]">school</span>
                    </div>
                  )}
                </div>

                <div className="p-3 flex flex-col gap-1 flex-1">
                  {/* Materia / Codigo */}
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6366f1]">
                    {classItem.code || "ASIGNATURA"}
                  </p>

                  {/* Nombre Clase */}
                  <h3 className="text-base font-bold text-[#111318] group-hover:text-primary transition-colors leading-tight mb-2">
                    {classItem.name}
                  </h3>

                  {/* Footer: Badge + Video Count */}
                  <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    {/* Estado */}
                    <div>
                      {classItem.has_pending_videos ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold bg-[#fff7ed] text-[#c2410c]">
                          <span className="material-symbols-outlined text-[14px] filled">play_circle</span>
                          Con videos pendientes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold bg-[#f3f4f6] text-[#4b5563]">
                          <span className="material-symbols-outlined text-[14px] filled">check_circle</span>
                          Sin videos pendientes
                        </span>
                      )}
                    </div>

                    {/* Contador videos (Solo texto) */}
                    <span className="text-[10px] font-bold text-gray-500 whitespace-nowrap">
                      {classItem.videos_count || 0} videos
                    </span>
                  </div>
                </div>
              </Link>
            )))}
        </div>
      </div>

      {/* Join Class Modal */}
      {isJoinModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setIsJoinModalOpen(false)}
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#111318]">
                Unirse a Clase
              </h2>
              <button
                onClick={() => setIsJoinModalOpen(false)}
                className="text-[#616f89] hover:text-[#111318]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleJoinClass} className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#111318]">
                  Código de Acceso
                </label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="Ingresa el código de acceso"
                  className="w-full rounded-lg border border-[#dbdfe6] bg-white text-[#111318] h-12 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-center text-2xl font-bold tracking-widest uppercase"
                  required
                  maxLength={20}
                />
                {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
                <p className="text-xs text-[#616f89]">
                  Solicita el código de acceso a tu profesor
                </p>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-[#e5e7eb]">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="px-5 py-2.5 rounded-lg border border-[#dbdfe6] text-[#111318] hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-primary hover:bg-blue-700 text-white font-medium transition-colors"
                >
                  Unirse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

