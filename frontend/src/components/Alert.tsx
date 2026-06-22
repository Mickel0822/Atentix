"use client";

import { useEffect } from "react";

interface AlertProps {
  message?: string;
  detail?: string;
  type?: "success" | "error";
  isOpen: boolean;
  onClose: () => void;
  duration?: number; // Duración en milisegundos antes de cerrar automáticamente (0 = no cerrar automáticamente)
}

/**
 * Componente de alerta personalizado que muestra mensajes de éxito o error
 */
export default function Alert({
  message,
  detail,
  type = "success",
  isOpen,
  onClose,
  duration = 3000,
}: AlertProps) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const isSuccess = type === "success";
  const bgColor = isSuccess ? "bg-green-50" : "bg-red-50";
  const borderColor = isSuccess ? "border-green-200" : "border-red-200";
  const textColor = isSuccess ? "text-green-800" : "text-red-800";
  const iconColor = isSuccess ? "text-green-600" : "text-red-600";
  const iconName = isSuccess ? "check_circle" : "error";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={`${bgColor} ${borderColor} ${textColor} border-2 rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200`}
      >
        <div className="flex items-start gap-4">
          <div className={`${iconColor} flex-shrink-0`}>
            <span className="material-symbols-outlined text-3xl">
              {iconName}
            </span>
          </div>
          <div className="flex-1">
            {message && (
              <p className="text-base font-medium leading-relaxed mb-2">
                {message}
              </p>
            )}
            {detail && (
              <p
                className={`leading-relaxed ${
                  message
                    ? "text-sm opacity-90"
                    : "text-base font-medium"
                }`}
              >
                {detail}
              </p>
            )}
            {!message && !detail && (
              <p className="text-base font-medium leading-relaxed">
                Ha ocurrido un error desconocido
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className={`${iconColor} hover:opacity-70 transition-opacity flex-shrink-0`}
            aria-label="Cerrar alerta"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
      </div>
    </div>
  );
}

