"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Admin/Header";
import api from "@/services/api";

export default function CrearClasePage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        code: "", // Opcional
        schedule: "", // Opcional
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // US-05: Obtener identificador del profesor autenticado para asignación de la clase
            const teacherId = "profesor-demo-id"; // Placeholder ID

            // US-05: Enviar petición POST al backend para crear y guardar la clase en la base de datos
            await api.post(`/classes/?professor_id=${teacherId}`, formData);

            // US-05: Redirigir al panel de control del profesor tras la creación exitosa
            router.push("/profesor");
            router.refresh(); // Refrescar dashboard para ver la nueva clase
        } catch (err) {
            console.error("Error creando clase:", err);
            setError("Error al crear la clase. Intenta nuevamente.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Header
                title="Crear Nueva Clase"
                subtitle="Configura una nueva asignatura"
            />
            <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 md:p-8">
                <div className="bg-white rounded-xl shadow-sm border border-[#e5e7eb] p-8">
                    <h2 className="text-xl font-bold text-[#111318] mb-6">Detalles de la Clase</h2>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        <label className="flex flex-col gap-2">
                            <span className="text-[#111318] text-sm font-medium">Nombre de la Clase</span>
                            <input
                                type="text"
                                required
                                className="w-full rounded-lg border border-[#dbdfe6] bg-white text-[#111318] h-12 px-4 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                placeholder="Ej. Matemáticas Avanzadas"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </label>

                        <label className="flex flex-col gap-2">
                            <span className="text-[#111318] text-sm font-medium">Descripción</span>
                            <textarea
                                className="w-full rounded-lg border border-[#dbdfe6] bg-white text-[#111318] min-h-[100px] p-4 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none"
                                placeholder="Descripción breve de la asignatura..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </label>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <label className="flex flex-col gap-2">
                                <span className="text-[#111318] text-sm font-medium">Código (Opcional)</span>
                                <input
                                    type="text"
                                    className="w-full rounded-lg border border-[#dbdfe6] bg-white text-[#111318] h-12 px-4 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                    placeholder="Ej. MAT-101"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                />
                            </label>

                            <label className="flex flex-col gap-2">
                                <span className="text-[#111318] text-sm font-medium">Horario (Opcional)</span>
                                <input
                                    type="text"
                                    className="w-full rounded-lg border border-[#dbdfe6] bg-white text-[#111318] h-12 px-4 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                    placeholder="Ej. Lun-Mie 08:00 - 10:00"
                                    value={formData.schedule}
                                    onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                                />
                            </label>
                        </div>

                        {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

                        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-6 py-2.5 rounded-lg bg-primary hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50"
                            >
                                {isLoading ? "Creando..." : "Crear Clase"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
