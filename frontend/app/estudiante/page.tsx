"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Admin/Header";
import Link from "next/link";
import api from "@/services/api";
import { getErrorMessage } from "@/services/error";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function EstudianteDashboard() {

  const { user } = useCurrentUser();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [recentGrades, setRecentGrades] = useState<any[]>([]);

  const displayName = user?.user_metadata?.name || user?.user_metadata?.full_name || "Estudiante";


  useEffect(() => {
    fetchClasses();
    if (user?.id) fetchRecentGrades();
  }, [user]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/classes/');
      setClasses(res.data);
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentGrades = async () => {
    try {
      if (!user?.id) return;
      const res = await api.get(`/sessions/student/${user.id}/history`);
      // Filtrar solo las que tienen quiz con nota
      const graded = res.data.filter((s: any) => s.generated_quizzes && s.generated_quizzes.length > 0 && s.generated_quizzes[0].score_obtained !== null);
      setRecentGrades(graded.slice(0, 4)); // Mostrar ultimas 4
    } catch (err) {
      console.error("Error fetching grades", err);
    }
  };

  const handleJoinClass = async (classId: string) => {
    console.log("Joined class", classId);
  };

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Resumen de tu actividad académica"
      />
      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
        {/* Greeting */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-[#111318]">
            Hola, {displayName} 👋
          </h1>
          <p className="text-[#616f89]">
            Bienvenido a tus clases. Selecciona una para comenzar.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Column: Active Classes */}
          <div className="xl:col-span-2 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#111318]">
                Clases Disponibles
              </h2>
            </div>

            {loading ? (
              <div className="p-10 text-center text-gray-400">Cargando clases...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {classes.map((classItem) => (
                  <Link
                    key={classItem.id}
                    href={`/estudiante/clases/${classItem.id}/videos`}
                    className="flex flex-col bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden hover:shadow-md transition-shadow group cursor-pointer h-full"
                  >
                    {/* Header con Imagen/Gradiente */}
                    <div className="relative h-32 w-full bg-cover bg-center" style={{
                      backgroundImage: classItem.imageUrl ? `url(${classItem.imageUrl})` : 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)'
                    }}>
                      {/* 3D Shape Placeholder si no hay imagen real (simulado con icono grande opacity) */}
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

                      {/* Badge de Estado (sticky bottom of card content) */}
                      <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
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

                        {/* Contador videos (Solo texto) - Agregando si no estaba o actualizando */}
                        <span className="text-[10px] font-bold text-gray-500 whitespace-nowrap">
                          {classItem.videos_count || 0} videos
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
                {classes.length === 0 && (
                  <div className="col-span-2 p-8 text-center bg-gray-50 rounded-xl border border-dashed">
                    <p className="text-gray-500">No hay clases disponibles en este momento.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Widgets */}
          <div className="flex flex-col gap-6">
            {/* Recent Grades Widget */}
            <div className="bg-white p-6 rounded-xl border border-[#e5e7eb] shadow-sm">
              <h3 className="text-lg font-bold text-[#111318] mb-6">
                Calificaciones Recientes
              </h3>

              {recentGrades.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Tus calificaciones aparecerán aquí cuando completes los cuestionarios.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {recentGrades.map((session) => {
                    const quiz = session.generated_quizzes[0];
                    const score = quiz.score_obtained;
                    const isHigh = score >= 14;
                    const isLow = score < 14;

                    // Formatear display
                    const scoreDisplay = score % 1 === 0 ? score : score.toFixed(1);

                    return (
                      <Link
                        key={session.id}
                        href={`/estudiante/cuestionario/${quiz.quiz_id}`}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-[#111318] group-hover:text-primary transition-colors">
                            {session.tasks?.title || "Evaluación"}
                          </span>
                          <span className="text-xs text-[#616f89]">
                            {session.tasks?.classes?.name || "Asignatura desconocida"}
                          </span>
                        </div>
                        <span className={`text-base font-bold ${isHigh ? 'text-green-600' : 'text-[#111318]'}`}>
                          {scoreDisplay}
                        </span>
                      </Link>
                    );
                  })}

                  <Link href="/estudiante/resultados" className="mt-2 w-full block text-center text-xs font-bold text-primary hover:underline py-2">
                    Ver reporte completo
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

