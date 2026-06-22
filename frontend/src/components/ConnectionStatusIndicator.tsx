"use client";

import type { ConnectionStatus } from "@/hooks/useConnectionStatus";

interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
}

/**
 * Componente que muestra el estado de conexión con el backend
 */
export default function ConnectionStatusIndicator({
  status,
}: ConnectionStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "connected":
        return {
          color: "bg-green-500",
          text: "Conectado",
        };
      case "disconnected":
        return {
          color: "bg-red-500",
          text: "Desconectado",
        };
      case "checking":
        return {
          color: "bg-yellow-500",
          text: "Verificando...",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
      <div className={`w-3 h-3 rounded-full ${config.color}`} />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {config.text}
      </span>
    </div>
  );
}
