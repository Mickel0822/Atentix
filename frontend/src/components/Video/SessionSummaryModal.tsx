"use client";

import { useMemo } from "react";

interface SessionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (attentionLevel: "alto" | "medio" | "bajo") => void;
  pausedTime: number; // segundos
  accumulatedAttention: number[]; // array de scores 0.0 a 1.0
  totalVideoTime: number; // duración total del video en segundos
}

export default function SessionSummaryModal({
  isOpen,
  onClose,
  onConfirm,
  pausedTime,
  accumulatedAttention,
  totalVideoTime,
}: SessionSummaryModalProps) {
  // Calcular estadísticas
  const stats = useMemo(() => {
    if (accumulatedAttention.length === 0 || totalVideoTime === 0) {
      return {
        avgAttention: 0,
        pausedPercentage: 0,
        activePercentage: 0,
        altoPercentage: 0,
        medioPercentage: 0,
        bajoPercentage: 0,
        conclusion: "Sin datos suficientes",
        conclusionType: "medio" as "alto" | "medio" | "bajo",
      };
    }

    // Promedio de atención en porcentaje
    const avgAttention =
      (accumulatedAttention.reduce((a, b) => a + b, 0) /
        accumulatedAttention.length) *
      100;

    // Porcentajes de tiempo
    const pausedPercentage = (pausedTime / totalVideoTime) * 100;
    const activePercentage =
      ((totalVideoTime - pausedTime) / totalVideoTime) * 100;

    // Distribución de niveles
    const total = accumulatedAttention.length;
    const alto = accumulatedAttention.filter((s) => s > 0.7).length;
    const medio = accumulatedAttention.filter(
      (s) => s > 0.4 && s <= 0.7
    ).length;
    const bajo = accumulatedAttention.filter((s) => s <= 0.4).length;

    const altoPercentage = (alto / total) * 100;
    const medioPercentage = (medio / total) * 100;
    const bajoPercentage = (bajo / total) * 100;

    // Conclusión
    let conclusion: string;
    let conclusionType: "alto" | "medio" | "bajo";

    if (avgAttention > 70 && pausedPercentage < 10) {
      conclusion = "Atención Alta";
      conclusionType = "alto";
    } else if (
      (avgAttention >= 40 && avgAttention <= 70) ||
      (pausedPercentage >= 10 && pausedPercentage <= 25)
    ) {
      conclusion = "Atención Media";
      conclusionType = "medio";
    } else {
      conclusion = "Atención Baja";
      conclusionType = "bajo";
    }

    return {
      avgAttention,
      pausedPercentage,
      activePercentage,
      altoPercentage,
      medioPercentage,
      bajoPercentage,
      conclusion,
      conclusionType,
    };
  }, [pausedTime, accumulatedAttention, totalVideoTime]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">
            Resumen de la Sesión
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Estadísticas principales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-blue-600">
                  pause_circle
                </span>
                <h3 className="text-sm font-semibold text-blue-900">
                  Tiempo Pausado
                </h3>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                {formatTime(pausedTime)}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                {stats.pausedPercentage.toFixed(1)}% del total
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-green-600">
                  play_circle
                </span>
                <h3 className="text-sm font-semibold text-green-900">
                  Tiempo Activo
                </h3>
              </div>
              <p className="text-2xl font-bold text-green-700">
                {formatTime(totalVideoTime - pausedTime)}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {stats.activePercentage.toFixed(1)}% del total
              </p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-purple-600">
                  visibility
                </span>
                <h3 className="text-sm font-semibold text-purple-900">
                  Promedio Atención
                </h3>
              </div>
              <p className="text-2xl font-bold text-purple-700">
                {stats.avgAttention.toFixed(1)}%
              </p>
              <p className="text-sm text-purple-600 mt-1">Promedio general</p>
            </div>
          </div>

          {/* Gráfica de distribución de niveles */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Distribución de Niveles de Atención
            </h3>
            <div className="space-y-4">
              {/* Barra Alto */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500"></div>
                    <span className="text-sm font-medium text-gray-700">
                      Alto
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {stats.altoPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-green-500 h-full flex items-center justify-end pr-2 transition-all duration-500"
                    style={{ width: `${stats.altoPercentage}%` }}
                  >
                    {stats.altoPercentage > 5 && (
                      <span className="text-xs font-bold text-white">
                        {stats.altoPercentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Barra Medio */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-500"></div>
                    <span className="text-sm font-medium text-gray-700">
                      Medio
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {stats.medioPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-yellow-500 h-full flex items-center justify-end pr-2 transition-all duration-500"
                    style={{ width: `${stats.medioPercentage}%` }}
                  >
                    {stats.medioPercentage > 5 && (
                      <span className="text-xs font-bold text-white">
                        {stats.medioPercentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Barra Bajo */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500"></div>
                    <span className="text-sm font-medium text-gray-700">
                      Bajo
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {stats.bajoPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-red-500 h-full flex items-center justify-end pr-2 transition-all duration-500"
                    style={{ width: `${stats.bajoPercentage}%` }}
                  >
                    {stats.bajoPercentage > 5 && (
                      <span className="text-xs font-bold text-white">
                        {stats.bajoPercentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfica circular - Tiempo pausado vs activo */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Distribución de Tiempo
            </h3>
            <div className="flex items-center justify-center">
              <div className="relative w-48 h-48">
                {/* Círculo de fondo */}
                <svg className="transform -rotate-90 w-48 h-48">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="16"
                  />
                  {/* Arco de tiempo activo */}
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="16"
                    strokeDasharray={`${2 * Math.PI * 88}`}
                    strokeDashoffset={`${
                      2 * Math.PI * 88 * (1 - stats.activePercentage / 100)
                    }`}
                    className="transition-all duration-500"
                  />
                  {/* Arco de tiempo pausado */}
                  {stats.pausedPercentage > 0 && (
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="16"
                      strokeDasharray={`${2 * Math.PI * 88}`}
                      strokeDashoffset={`${
                        2 * Math.PI * 88 * (1 - stats.pausedPercentage / 100)
                      }`}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                      style={{
                        transform: `rotate(${
                          (stats.activePercentage / 100) * 360
                        }deg)`,
                        transformOrigin: "96px 96px",
                      }}
                    />
                  )}
                </svg>
                {/* Texto en el centro */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">
                    {stats.activePercentage.toFixed(0)}%
                  </span>
                  <span className="text-sm text-gray-600">Activo</span>
                  {stats.pausedPercentage > 0 && (
                    <>
                      <span className="text-xl font-bold text-red-600 mt-1">
                        {stats.pausedPercentage.toFixed(0)}%
                      </span>
                      <span className="text-xs text-gray-600">Pausado</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Conclusión */}
          <div
            className={`rounded-lg p-6 border-2 ${
              stats.conclusionType === "alto"
                ? "bg-green-50 border-green-300"
                : stats.conclusionType === "medio"
                ? "bg-yellow-50 border-yellow-300"
                : "bg-red-50 border-red-300"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`material-symbols-outlined text-3xl ${
                  stats.conclusionType === "alto"
                    ? "text-green-600"
                    : stats.conclusionType === "medio"
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {stats.conclusionType === "alto"
                  ? "check_circle"
                  : stats.conclusionType === "medio"
                  ? "info"
                  : "warning"}
              </span>
              <h3 className="text-xl font-bold text-gray-900">Conclusión</h3>
            </div>
            <p
              className={`text-lg font-semibold ${
                stats.conclusionType === "alto"
                  ? "text-green-800"
                  : stats.conclusionType === "medio"
                  ? "text-yellow-800"
                  : "text-red-800"
              }`}
            >
              {stats.conclusion}
            </p>
            <p className="text-sm text-gray-700 mt-2">
              {stats.conclusionType === "alto"
                ? "Has mantenido un excelente nivel de atención durante la sesión. ¡Sigue así!"
                : stats.conclusionType === "medio"
                ? "Tu nivel de atención fue moderado. Intenta reducir las distracciones para mejorar."
                : "Tu nivel de atención fue bajo. Considera tomar descansos y mejorar tu entorno de estudio."}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            Cerrar
          </button>
          <button
            onClick={() => onConfirm(stats.conclusionType)}
            className="px-6 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg transition-colors font-bold flex items-center gap-2"
          >
            <span>Continuar al Cuestionario</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
