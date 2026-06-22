"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Admin/Header";
import Link from "next/link";
import api from "@/services/api";

export default function ResultadosPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/classes/');
      setClasses(res.data);
    } catch (err) {
      console.error("Error fetching classes:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header
        title="Resultados"
        subtitle="Visualiza tus resultados por clase"
        user={{
          name: "Estudiante",
          email: "estudiante@demo.com",
          role: "Estudiante",
        }}
      />

      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[#111318]">Resultados</h1>
          <p className="text-[#616f89]">
            Visualiza tus resultados por clase
          </p>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-3 text-center py-10 text-gray-500">Cargando clases...</div>
          ) : classes.length === 0 ? (
            <div className="col-span-3 text-center py-10 text-gray-500 border border-dashed rounded-xl">
              No tienes clases con resultados disponibles.
            </div>
          ) : (
            classes.map((classItem) => (
              <Link
                key={classItem.id}
                href={`/estudiante/resultados/${classItem.id}`}
                className="flex flex-col bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden hover:shadow-md transition-shadow group cursor-pointer h-full"
              >
                {/* Imagen (Mitad superior) */}
                <div className="relative h-48 w-full bg-gray-200">
                  {classItem.imageUrl ? (
                    <img
                      src={classItem.imageUrl}
                      alt={classItem.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    // Gradiente o imagen default parecida a la muestra
                    <div className="absolute inset-0 bg-gradient-to-br from-[#537365] to-[#E3D8B4]"></div>
                  )}
                </div>

                {/* Contenido (Mitad inferior) */}
                <div className="p-6 flex flex-col gap-2 flex-1">
                  <h3 className="text-xl font-bold text-[#111318] group-hover:text-primary transition-colors">
                    {classItem.name}
                  </h3>
                  <p className="text-sm text-[#616f89]">
                    {/* Profesor placeholder o real si viene del back */}
                    Prof. Asignado
                  </p>
                  <p className="text-xs text-[#616f89] mt-2">
                    {/* Placeholder para evaluaciones */}
                    0 evaluaciones completadas
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </>
  );
}

