/**
 * Barra visual de engagement (0-100%).
 * 
 * Colores:
 * - Verde (>70%): Alta atención
 * - Amarillo (40-70%): Atención media
 * - Rojo (<40%): Baja atención
 */

import React from "react";

interface EngagementBarProps {
    score: number; // 0-1
    className?: string;
    showLabel?: boolean;
    showPercentage?: boolean;
}

export function EngagementBar({
    score,
    className = "",
    showLabel = true,
    showPercentage = true
}: EngagementBarProps) {
    // Convertir a porcentaje
    const percentage = Math.round(Math.max(0, Math.min(1, score)) * 100);

    // Determinar color basado en el score
    const getColor = () => {
        if (percentage >= 70) return { bg: "bg-green-500", text: "text-green-400" };
        if (percentage >= 40) return { bg: "bg-yellow-500", text: "text-yellow-400" };
        return { bg: "bg-red-500", text: "text-red-400" };
    };

    const { bg, text } = getColor();

    return (
        <div className={`w-full ${className}`}>
            {showLabel && (
                <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-300">
                        Nivel de Atención
                    </span>
                    {showPercentage && (
                        <span className={`text-sm font-bold ${text}`}>
                            {percentage}%
                        </span>
                    )}
                </div>
            )}

            {/* Contenedor de la barra */}
            <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                {/* Barra de progreso con animación */}
                <div
                    className={`h-full ${bg} rounded-full transition-all duration-300 ease-out`}
                    style={{ width: `${percentage}%` }}
                >
                    {/* Efecto de brillo */}
                    <div
                        className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        style={{
                            animation: "shimmer 2s infinite"
                        }}
                    />
                </div>
            </div>

            {/* Marcadores de referencia */}
            <div className="flex justify-between mt-1 px-1">
                <span className="text-[10px] text-gray-500">0</span>
                <span className="text-[10px] text-gray-500">50</span>
                <span className="text-[10px] text-gray-500">100</span>
            </div>

            {/* CSS para animación */}
            <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
        </div>
    );
}

/**
 * Versión compacta de la barra de engagement.
 */
export function EngagementBarCompact({ score }: { score: number }) {
    const percentage = Math.round(Math.max(0, Math.min(1, score)) * 100);

    const getColor = () => {
        if (percentage >= 70) return "bg-green-500";
        if (percentage >= 40) return "bg-yellow-500";
        return "bg-red-500";
    };

    return (
        <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full ${getColor()} rounded-full transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <span className="text-xs font-mono text-gray-400">{percentage}%</span>
        </div>
    );
}
