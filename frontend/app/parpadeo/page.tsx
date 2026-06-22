"use client";

import React, { useState } from "react";
import { AttentionMonitor } from "@/components/AttentionMonitor/AttentionMonitor";
import { useSaludo } from "@/hooks/useSaludo";

export default function ParpadeoPage() {
  const { saludo, saludoError, saludoLoading } = useSaludo();

  // Estado local para mostrar métricas
  const [metrics, setMetrics] = useState<any>(null);

  // Use useCallback para mantener la referencia estable y evitar re-renders infinitos
  const handleMetricsUpdate = React.useCallback((m: any) => {
    setMetrics(m);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-7xl flex-col items-center justify-center py-4 px-4 sm:py-8 sm:px-6 lg:px-8 bg-white dark:bg-black">
        <div className="flex flex-col items-center justify-center gap-4 sm:gap-6 lg:gap-8 w-full flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white mb-2">
            Monitor de Atención Integral
          </h1>

          <div className="w-full flex flex-col md:flex-row gap-8 items-start justify-center">

            {/* Monitor de Atención (Cámara + Métricas) */}
            <div className="w-full md:w-auto flex-shrink-0">
              <AttentionMonitor
                className="w-full md:w-[640px]"
                showDebugInfo={true}
                onMetricsUpdate={handleMetricsUpdate}
              />
            </div>

            {/* Panel Lateral con Info Adicional (Backend msg, etc) */}
            <div className="flex flex-col gap-4 w-full md:max-w-xs">

              {/* Mensaje del Servidor */}
              <div className="w-full p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-semibold mb-2">Conexión Backpack:</h3>
                {saludoLoading && <p className="text-sm text-gray-500">Cargando...</p>}
                {saludoError && <p className="text-sm text-red-500">{saludoError}</p>}
                {saludo && <p className="text-sm font-medium text-green-600">{saludo}</p>}
              </div>

              {/* Resumen de Métricas (redundante pero para demo) */}
              <div className="w-full p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-semibold mb-2 text-blue-800 dark:text-blue-300">
                  Estado Actual
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Score:</span>
                    <span className="font-bold">{metrics ? (metrics.score * 100).toFixed(0) + "%" : "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rostro:</span>
                    <span className={metrics?.faceDetected ? "text-green-600" : "text-red-600"}>
                      {metrics?.faceDetected ? "Detectado" : "No detectado"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mirada:</span>
                    <span>{metrics?.gaze ? `P:${metrics.gaze.pitch.toFixed(0)} Y:${metrics.gaze.yaw.toFixed(0)}` : "-"}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
