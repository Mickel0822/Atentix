"use client";

import { useState, useEffect } from "react";
import { obtenerSaludo } from "@/services/checkService";

/**
 * Hook para manejar la carga del saludo del servidor
 * @returns Objeto con el estado del saludo (mensaje, error, loading)
 */
export function useSaludo() {
  const [saludo, setSaludo] = useState<string | null>(null);
  const [saludoError, setSaludoError] = useState<string | null>(null);
  const [saludoLoading, setSaludoLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const cargarSaludo = async () => {
      try {
        setSaludoLoading(true);
        setSaludoError(null);
        const respuesta = await obtenerSaludo();

        // Solo actualizar el estado si el componente sigue montado
        if (isMounted) {
          setSaludo(respuesta.mensaje);
        }
      } catch (error) {
        // Solo actualizar el estado si el componente sigue montado
        if (isMounted) {
          setSaludoError(
            error instanceof Error ? error.message : "Error desconocido"
          );
        }
        // Log del error para debugging
        console.error("Error al cargar saludo:", error);
      } finally {
        if (isMounted) {
          setSaludoLoading(false);
        }
      }
    };

    cargarSaludo();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);

  return {
    saludo,
    saludoError,
    saludoLoading,
  };
}
