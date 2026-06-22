"use client";

import Link from "next/link";
import { createClientSupabase } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const cerrarSesion = async () => {
    setIsLoading(true);
    try {
      const supabase = createClientSupabase();
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      // Aún así redirigir al login
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-7xl flex-col items-center justify-center py-4 px-4 sm:py-8 sm:px-6 lg:px-8 bg-white dark:bg-black relative">
        {/* Botón de cerrar sesión en la esquina superior derecha */}
        <button
          onClick={cerrarSesion}
          disabled={isLoading}
          className="absolute top-4 right-4 px-6 py-2 border-2 border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 font-semibold text-base transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="material-symbols-outlined animate-spin">
                sync
              </span>
              Cerrando...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">logout</span>
              Cerrar sesión
            </>
          )}
        </button>

        <div className="flex flex-col items-center justify-center gap-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-black dark:text-white mb-8">
            Sistema de Detección
          </h1>

          <div className="flex flex-col sm:flex-row gap-6 items-center justify-center">
            <Link
              href="/reconocimiento"
              className="px-8 py-4 border-2 border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-white font-semibold text-lg transition-colors shadow-md hover:shadow-lg min-w-[200px] text-center"
            >
              Reconocimiento
            </Link>

            <Link
              href="/parpadeo"
              className="px-8 py-4 border-2 border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-white font-semibold text-lg transition-colors shadow-md hover:shadow-lg min-w-[200px] text-center"
            >
              Mirada a la pantalla
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
