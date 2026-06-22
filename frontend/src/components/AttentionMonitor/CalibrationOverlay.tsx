/**
 * Overlay de calibración para establecer el centro de la mirada.
 * 
 * Muestra 5 puntos (4 esquinas + centro) que el usuario debe mirar
 * para calibrar el sistema de detección de mirada.
 */

import React, { useState, useEffect, useCallback } from "react";

interface CalibrationOverlayProps {
    onPointComplete: (screenX: number, screenY: number) => void;
    onCalibrationComplete: () => void;
    onCancel: () => void;
}

// Posiciones de los puntos de calibración (porcentaje de la pantalla)
const CALIBRATION_POINTS = [
    { x: 50, y: 50, label: "Centro" },       // Centro primero
    { x: 10, y: 10, label: "Superior Izq" }, // Esquina superior izquierda
    { x: 90, y: 10, label: "Superior Der" }, // Esquina superior derecha
    { x: 10, y: 90, label: "Inferior Izq" }, // Esquina inferior izquierda
    { x: 90, y: 90, label: "Inferior Der" }, // Esquina inferior derecha
];

const POINT_DURATION = 2000; // 2 segundos por punto

export function CalibrationOverlay({
    onPointComplete,
    onCalibrationComplete,
    onCancel
}: CalibrationOverlayProps) {
    const [currentPointIndex, setCurrentPointIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isCapturing, setIsCapturing] = useState(false);

    const currentPoint = CALIBRATION_POINTS[currentPointIndex];
    const isLastPoint = currentPointIndex === CALIBRATION_POINTS.length - 1;

    // Capturar punto actual
    const capturePoint = useCallback(() => {
        setIsCapturing(true);

        // Calcular posición en píxeles
        const screenX = (currentPoint.x / 100) * window.innerWidth;
        const screenY = (currentPoint.y / 100) * window.innerHeight;

        // Animación de progreso
        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min(elapsed / POINT_DURATION, 1);
            setProgress(newProgress);

            if (newProgress >= 1) {
                clearInterval(interval);

                // Notificar punto completado
                onPointComplete(screenX, screenY);

                // Siguiente punto o completar
                if (isLastPoint) {
                    onCalibrationComplete();
                } else {
                    setCurrentPointIndex(prev => prev + 1);
                    setProgress(0);
                    setIsCapturing(false);
                }
            }
        }, 50);

        return () => clearInterval(interval);
    }, [currentPoint, isLastPoint, onPointComplete, onCalibrationComplete]);

    // Auto-iniciar captura cuando cambia el punto
    useEffect(() => {
        const timeout = setTimeout(() => {
            capturePoint();
        }, 500); // Pequeña pausa antes de empezar

        return () => clearTimeout(timeout);
    }, [currentPointIndex, capturePoint]);

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
            {/* Instrucciones */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                    Calibración de Mirada
                </h2>
                <p className="text-gray-300">
                    Mira fijamente al punto brillante durante 2 segundos
                </p>
                <p className="text-sm text-gray-500 mt-1">
                    Punto {currentPointIndex + 1} de {CALIBRATION_POINTS.length}: {currentPoint.label}
                </p>
            </div>

            {/* Puntos de calibración */}
            {CALIBRATION_POINTS.map((point, index) => {
                const isActive = index === currentPointIndex;
                const isCompleted = index < currentPointIndex;

                return (
                    <div
                        key={index}
                        className={`absolute transition-all duration-300 ${isActive ? "scale-100" : "scale-75 opacity-30"
                            }`}
                        style={{
                            left: `${point.x}%`,
                            top: `${point.y}%`,
                            transform: "translate(-50%, -50%)"
                        }}
                    >
                        {/* Punto externo */}
                        <div
                            className={`w-16 h-16 rounded-full border-4 flex items-center justify-center
                ${isCompleted ? "border-green-500 bg-green-500/20" :
                                    isActive ? "border-blue-500" : "border-gray-600"}`}
                        >
                            {/* Anillo de progreso */}
                            {isActive && isCapturing && (
                                <svg className="absolute w-20 h-20 -rotate-90">
                                    <circle
                                        cx="40"
                                        cy="40"
                                        r="36"
                                        fill="none"
                                        stroke="currentColor"
                                        className="text-blue-500"
                                        strokeWidth="4"
                                        strokeDasharray={`${progress * 226} 226`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                            )}

                            {/* Punto central */}
                            <div
                                className={`w-4 h-4 rounded-full ${isCompleted ? "bg-green-500" :
                                        isActive ? "bg-blue-500 animate-pulse" : "bg-gray-500"
                                    }`}
                            />

                            {/* Checkmark para completados */}
                            {isCompleted && (
                                <svg className="absolute w-8 h-8 text-green-500" viewBox="0 0 24 24">
                                    <path
                                        fill="currentColor"
                                        d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                                    />
                                </svg>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Barra de progreso general */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-64">
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{
                            width: `${((currentPointIndex + progress) / CALIBRATION_POINTS.length) * 100}%`
                        }}
                    />
                </div>
                <p className="text-center text-gray-500 text-sm mt-2">
                    Progreso general: {Math.round(((currentPointIndex + progress) / CALIBRATION_POINTS.length) * 100)}%
                </p>
            </div>

            {/* Botón cancelar */}
            <button
                onClick={onCancel}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
            >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}
