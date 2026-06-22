"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Admin/Header";
import Link from "next/link";
import api from "@/services/api";

export default function ProfesorDashboard() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_students: 0,
    pending_evaluations: 0,
    active_classes: 0,
    average_score: 0,
    recent_evaluations: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [classRes, statsRes] = await Promise.all([
          api.get('/classes/'),
          api.get('/stats/professor-dashboard')
        ]);
        setClasses(classRes.data);
        if (statsRes.data) {
          setStats(statsRes.data);
        }
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const handleClassClick = (classId: string) => {
    router.push(`/profesor/clases?classId=${classId}`);
  };

  return (
    <>
      <Header
        title={
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined">home</span>
            Inicio
          </div>
        }
        subtitle="Resumen de actividad académica"
      />
      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">

        {/* Stats Grid - Compact */}
        <section aria-label="Estadísticas">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-4 border border-[#e5e7eb] shadow-sm flex flex-col gap-2">
              <div className="bg-primary/10 p-2 rounded-lg text-primary w-fit">
                <span className="material-symbols-outlined text-[20px]">class</span>
              </div>
              <div>
                <p className="text-[#616f89] text-xs font-medium">Clases Activas</p>
                <h3 className="text-[#111318] text-xl font-bold mt-0.5">{stats.active_classes}</h3>
              </div>
            </div>
            {/* Students Card - Purple */}
            <div className="bg-white rounded-xl p-4 border border-[#e5e7eb] shadow-sm flex flex-col gap-2">
              <div className="bg-purple-50 p-2 rounded-lg text-purple-600 w-fit">
                <span className="material-symbols-outlined text-[20px]">group</span>
              </div>
              <div>
                <p className="text-[#616f89] text-xs font-medium">Estudiantes Matriculados</p>
                <h3 className="text-[#111318] text-xl font-bold mt-0.5">{stats.total_students}</h3>
              </div>
            </div>

            {/* Pending Evaluations Card - Orange */}
            <div className="bg-white rounded-xl p-4 border border-[#e5e7eb] shadow-sm flex flex-col gap-2">
              <div className="bg-orange-50 p-2 rounded-lg text-orange-600 w-fit">
                <span className="material-symbols-outlined text-[20px]">assignment</span>
              </div>
              <div>
                <p className="text-[#616f89] text-xs font-medium">Evaluaciones Pendientes</p>
                <h3 className="text-[#111318] text-xl font-bold mt-0.5">{stats.pending_evaluations}</h3>
              </div>
            </div>

            {/* Average Score Card - Green */}

          </div>
        </section>

        {/* Clases Activas */}
        <section aria-label="Clases">
          <h2 className="text-lg font-bold text-[#111318] mb-4">Mis Clases</h2>

          {loading ? (
            <div className="p-10 text-center text-gray-500">Cargando clases...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((classItem) => (
                <div
                  key={classItem.id}
                  className="bg-white rounded-xl border border-[#e5e7eb] p-4 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between cursor-pointer"
                  onClick={() => handleClassClick(classItem.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-blue-700 group-hover:text-blue-800 transition-colors line-clamp-1">
                      {classItem.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${classItem.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                      }`}>
                      {classItem.is_active ? "Activa" : "Inactiva"}
                    </span>
                  </div>

                  <p className="text-gray-500 text-xs mb-3 font-medium flex items-center gap-2 line-clamp-1">
                    {classItem.schedule || "Horario no definido"}
                  </p>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-auto">
                    <div className="flex items-center gap-1.5 text-gray-600 font-medium text-xs">
                      <span className="material-symbols-outlined text-[18px]">group</span>
                      {classItem.students_count || 0} Estudiantes
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600 font-medium text-xs">
                      <span className="material-symbols-outlined text-[18px]">video_library</span>
                      {classItem.videos_count || 0} Videos
                    </div>
                  </div>
                </div>
              ))}
              {classes.length === 0 && (
                <div className="col-span-2 p-10 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center">
                  <p className="text-gray-500 mb-4">No tienes clases creadas.</p>
                  <Link href="/profesor/crear-clase" className="text-primary font-medium hover:underline">Crear mi primera clase</Link>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Últimas Evaluaciones */}
        <section aria-label="Últimas Evaluaciones">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#111318]">Últimas Evaluaciones</h2>
            <Link href="/profesor/reportes" className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
              Ver reporte completo
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {(!stats.recent_evaluations || stats.recent_evaluations.length === 0) ? (
                <div className="p-5 text-center text-gray-500">No hay evaluaciones registradas aún.</div>
              ) : (
                stats.recent_evaluations.map((evalItem: any, index: number) => {
                  // Colores rotativos
                  const colors = [
                    "bg-red-50 text-red-600",
                    "bg-blue-50 text-blue-600",
                    "bg-purple-50 text-purple-600",
                    "bg-orange-50 text-orange-600",
                    "bg-green-50 text-green-600"
                  ];
                  const colorClass = colors[index % colors.length];

                  return (
                    <div key={evalItem.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`size-8 rounded-lg flex items-center justify-center ${colorClass}`}>
                          <span className="material-symbols-outlined text-[18px]">school</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-[#111318] text-sm leading-tight">{evalItem.class_name}</h4>
                          <p className="text-[10px] text-[#616f89] mt-0.5">{evalItem.time_ago}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block text-lg font-bold text-[#111318]">{evalItem.class_average}/20</span>
                        <p className="text-[10px] text-[#616f89]">Promedio General</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
