"use client";

import Header from "@/components/Admin/Header";
import Link from "next/link";
import { useState, useEffect } from "react";
import api from "@/services/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total_users: 0,
    active_students: 0,
    total_classes: 0,
    roles_distribution: { admin: 0, professor: 0, student: 0 },
    activity_chart: [] as any[],
    system_activity: [] as any[]
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/stats/admin-dashboard');
        if (res.data) {
          setStats(res.data);
        }
      } catch (error) {
        console.error("Error fetching admin stats:", error);
      }
    };
    fetchStats();
  }, []);
  return (
    <>
      <Header
        title="Bienvenido, Administrador"
        subtitle="Resumen de actividad del día"
      />
      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
        {/* Stats Grid */}
        <section aria-label="Statistics">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Stat Card 1 */}
            <div className="bg-white rounded-xl p-5 border border-[#e5e7eb] shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="bg-primary/10 p-2.5 rounded-lg text-primary">
                  <span className="material-symbols-outlined">group</span>
                </div>
              </div>
              <div>
                <p className="text-[#616f89] text-sm font-medium">
                  Total Usuarios
                </p>
                <h3 className="text-[#111318] text-2xl font-bold mt-1">
                  {stats.total_users}
                </h3>
              </div>
            </div>

            {/* Stat Card 2 */}
            <div className="bg-white rounded-xl p-5 border border-[#e5e7eb] shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="bg-purple-100 p-2.5 rounded-lg text-purple-600">
                  <span className="material-symbols-outlined">school</span>
                </div>
              </div>
              <div>
                <p className="text-[#616f89] text-sm font-medium">
                  Estudiantes Activos
                </p>
                <h3 className="text-[#111318] text-2xl font-bold mt-1">{stats.active_students}</h3>
              </div>
            </div>

            {/* Stat Card 3 */}
            <div className="bg-white rounded-xl p-5 border border-[#e5e7eb] shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="bg-orange-100 p-2.5 rounded-lg text-orange-600">
                  <span className="material-symbols-outlined">class</span>
                </div>
              </div>
              <div>
                <p className="text-[#616f89] text-sm font-medium">
                  Clases Creadas
                </p>
                <h3 className="text-[#111318] text-2xl font-bold mt-1">{stats.total_classes}</h3>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content: Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Widget: Actividad de Inicio de Sesión */}
          <section className="bg-white rounded-xl border border-[#e5e7eb] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-[#111318] text-lg">
                Actividad de Inicio de Sesión
              </h3>
              <div className="flex gap-2">
                <select className="bg-background-light border-none text-xs rounded-lg px-3 py-1.5 text-[#616f89] focus:ring-1 focus:ring-primary">
                  <option>Últimos 30 días</option>
                  <option>Última semana</option>
                </select>
              </div>
            </div>
            {/* Dynamic Chart Visual */}
            <div className="flex items-end gap-3 h-48 w-full px-2">
              {stats.activity_chart.length > 0 ? (
                stats.activity_chart.map((dayData, index) => {
                  const maxVal = Math.max(...stats.activity_chart.map((d) => d.count), 5); // Fallback max 5 para no dividir por 0
                  const height = maxVal > 0 ? (dayData.count / maxVal) * 100 : 0;

                  return (
                    <div
                      key={index}
                      className="w-full bg-primary/10 hover:bg-primary/20 transition-colors rounded-t-sm relative group"
                      style={{ height: `${height}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded">
                        {dayData.count}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                  Sin actividad reciente
                </div>
              )}
            </div>
            <div className="flex justify-between mt-2 text-xs text-[#616f89] px-2">
              {stats.activity_chart.length > 0
                ? stats.activity_chart.map((d, i) => <span key={i}>{d.day}</span>)
                : ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
            </div>
          </section>

          {/* Widget: Distribución de Roles */}
          <section className="bg-white rounded-xl border border-[#e5e7eb] p-6 shadow-sm">
            <h3 className="font-bold text-[#111318] text-lg mb-6">
              Distribución de Roles
            </h3>
            <div className="flex flex-col gap-4">
              {/* Role Item: Estudiantes */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <span className="material-symbols-outlined text-blue-600">
                      school
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#111318]">
                      Estudiantes
                    </p>
                    <p className="text-xs text-[#616f89]">{stats.roles_distribution.student} usuarios</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-[#111318]">
                  {stats.roles_distribution.student + stats.roles_distribution.professor + stats.roles_distribution.admin > 0
                    ? Math.round((stats.roles_distribution.student / (stats.roles_distribution.student + stats.roles_distribution.professor + stats.roles_distribution.admin)) * 100)
                    : 0}%
                </span>
              </div>

              {/* Role Item: Profesores */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <span className="material-symbols-outlined text-purple-600">
                      cast_for_education
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#111318]">
                      Profesores
                    </p>
                    <p className="text-xs text-[#616f89]">{stats.roles_distribution.professor} usuarios</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-[#111318]">
                  {stats.roles_distribution.student + stats.roles_distribution.professor + stats.roles_distribution.admin > 0
                    ? Math.round((stats.roles_distribution.professor / (stats.roles_distribution.student + stats.roles_distribution.professor + stats.roles_distribution.admin)) * 100)
                    : 0}%
                </span>
              </div>

              {/* Role Item: Administradores */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 p-2 rounded-lg">
                    <span className="material-symbols-outlined text-indigo-600">
                      admin_panel_settings
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#111318]">
                      Administradores
                    </p>
                    <p className="text-xs text-[#616f89]">{stats.roles_distribution.admin} usuarios</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-[#111318]">
                  {stats.roles_distribution.student + stats.roles_distribution.professor + stats.roles_distribution.admin > 0
                    ? Math.round((stats.roles_distribution.admin / (stats.roles_distribution.student + stats.roles_distribution.professor + stats.roles_distribution.admin)) * 100)
                    : 0}%
                </span>
              </div>
            </div>
            <Link
              href="/admin/usuarios"
              className="mt-6 w-full py-2.5 text-center text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors inline-block"
            >
              Ver Gestión de Usuarios
            </Link>
          </section>

          {/* Widget: Seguridad del Sistema */}
          <section className="bg-white rounded-xl border border-[#e5e7eb] p-6 shadow-sm">
            <h3 className="font-bold text-[#111318] text-lg mb-6">
              Seguridad del Sistema
            </h3>
            <div className="flex flex-col gap-4">
              {/* Security Item */}
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-green-600">
                    shield
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[#111318]">
                      Sistema Seguro
                    </p>
                    <p className="text-xs text-[#616f89]">
                      Última verificación: Hace 2 horas
                    </p>
                  </div>
                </div>
                <span className="size-2 rounded-full bg-green-500"></span>
              </div>

              {/* Security Item */}
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-yellow-600">
                    lock_reset
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[#111318]">
                      Contraseñas Reseteadas
                    </p>
                    <p className="text-xs text-[#616f89]">
                      3 en las últimas 24 horas
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-yellow-600">3</span>
              </div>

              {/* Security Item */}
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-600">
                    block
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[#111318]">
                      Intentos Fallidos
                    </p>
                    <p className="text-xs text-[#616f89]">
                      5 intentos bloqueados hoy
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-red-600">5</span>
              </div>
            </div>
          </section>

          {/* Widget: Actividad Reciente */}
          <section className="bg-white rounded-xl border border-[#e5e7eb] p-6 shadow-sm">
            <h3 className="font-bold text-[#111318] text-lg mb-6">
              Actividad Reciente del Sistema
            </h3>
            <div className="flex flex-col gap-4">
              {/* Activity Items */}
              {stats.system_activity && stats.system_activity.length > 0 ? (
                stats.system_activity.map((activity, index) => {
                  const colorClasses = {
                    blue: "bg-blue-100 text-blue-600",
                    green: "bg-green-100 text-green-600",
                    yellow: "bg-yellow-100 text-yellow-600",
                    red: "bg-red-100 text-red-600",
                    purple: "bg-purple-100 text-purple-600",
                    orange: "bg-orange-100 text-orange-600",
                  };
                  const activityColorClass = colorClasses[activity.color as keyof typeof colorClasses] || "bg-gray-100 text-gray-600";

                  return (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div
                        className={`${activityColorClass} rounded-full p-2 h-fit`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {activity.icon}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#111318]">
                          {activity.title}
                        </p>
                        <p className="text-xs text-[#616f89]">
                          {activity.description}
                        </p>
                        <span className="text-[10px] text-[#616f89] mt-1 block">
                          {activity.time}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-gray-500 py-4 text-sm">
                  No hay actividad reciente.
                </div>
              )}
            </div>
          </section>
        </div >
      </div >
    </>
  );
}
