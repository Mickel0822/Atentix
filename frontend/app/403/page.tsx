"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ForbiddenPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir automáticamente después de 5 segundos
    const timer = setTimeout(() => {
      router.push("/");
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-2xl flex-col items-center justify-center py-4 px-4 sm:py-8 sm:px-6 lg:px-8 bg-white dark:bg-black">
        <div className="flex flex-col items-center justify-center gap-6 text-center">
          {/* Icono de error */}
          <div className="size-24 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-6xl text-red-600 dark:text-red-400">
              block
            </span>
          </div>

          {/* Título */}
          <h1 className="text-4xl sm:text-5xl font-bold text-black dark:text-white">
            403
          </h1>

          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 dark:text-slate-200">
            Acceso Prohibido
          </h2>

          {/* Mensaje */}
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md">
            No tienes permisos para acceder a esta página. Por favor, contacta
            al administrador si crees que esto es un error.
          </p>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Link
              href="/"
              className="px-6 py-3 border-2 border-primary rounded-lg bg-primary hover:bg-blue-700 text-white font-semibold text-base transition-colors shadow-md hover:shadow-lg"
            >
              Volver al inicio
            </Link>
            <button
              onClick={() => router.back()}
              className="px-6 py-3 border-2 border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-white font-semibold text-base transition-colors shadow-md hover:shadow-lg"
            >
              Página anterior
            </button>
          </div>

          {/* Contador */}
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-4">
            Serás redirigido automáticamente en 5 segundos...
          </p>
        </div>
      </main>
    </div>
  );
}

