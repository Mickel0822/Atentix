import { useState, useEffect } from "react";
import api from "@/services/api";

interface Class {
    id: string;
    name: string;
}

export interface Video {
    id: string;
    title: string;
    description: string;
    class_id: string; // ID para edición
    class_name?: string; // Nombre para visualización
    duration_seconds: number;
    questions_count: number;
    created_at: string;
    inicio_habilitado?: string;
    is_active: boolean;
    video_url: string;
}

export function EditVideoModal({
    isOpen,
    onClose,
    video,
    onSave,
}: {
    isOpen: boolean;
    onClose: () => void;
    video: Video | null;
    onSave: (videoData: Partial<Video>) => void;
}) {
    const [formData, setFormData] = useState<Partial<Video>>({});
    const [classes, setClasses] = useState<Class[]>([]);

    useEffect(() => {
        if (isOpen && video) {
            setFormData({
                ...video
            });
            // Cargar clases para el select
            fetchClasses();
        }
    }, [isOpen, video]);

    const fetchClasses = async () => {
        try {
            const res = await api.get("/classes/"); // Asumiendo que retorna todas las del profe
            setClasses(res.data);
        } catch (error) {
            console.error("Error loading classes for select", error);
        }
    };

    if (!isOpen || !video) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    // Helper para fecha "dd/mm/aaaa --:--" visualmente es complejo con input nativo.
    // Usaremos datetime-local standard.
    // Formatear fecha para el input value (YYYY-MM-DDThh:mm)
    const formatDateForInput = (isoDate?: string) => {
        if (!isoDate) return "";
        return new Date(isoDate).toISOString().slice(0, 16);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
                    <h2 className="text-xl font-bold text-[#111318]">Editar Video</h2>
                    <button
                        onClick={onClose}
                        className="text-[#616f89] hover:text-[#111318]"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                    <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-[#111318]">
                            Título del Video
                        </span>
                        <input
                            className="w-full rounded-lg border border-[#dbdfe6] bg-white text-[#111318] h-12 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            type="text"
                            value={formData.title || ""}
                            onChange={(e) =>
                                setFormData({ ...formData, title: e.target.value })
                            }
                        />
                    </label>

                    <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-[#111318]">
                            Descripción
                        </span>
                        <textarea
                            className="w-full rounded-lg border border-[#dbdfe6] bg-white text-[#111318] min-h-[100px] p-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                            value={formData.description || ""}
                            onChange={(e) =>
                                setFormData({ ...formData, description: e.target.value })
                            }
                        />
                    </label>

                    <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-[#111318]">
                            Asignar a Clase
                        </span>
                        <div className="relative">
                            <select
                                className="w-full appearance-none rounded-lg border border-[#dbdfe6] bg-white text-[#111318] h-12 px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all cursor-pointer"
                                value={formData.class_id || ""}
                                onChange={(e) =>
                                    setFormData({ ...formData, class_id: e.target.value })
                                }
                            >
                                <option value="">Seleccionar Clase</option>
                                {classes.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#616f89]">
                                <span className="material-symbols-outlined text-[20px]">
                                    expand_more
                                </span>
                            </span>
                        </div>
                    </label>

                    <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-[#111318]">
                            Fecha y Hora de Publicación
                        </span>
                        <input
                            type="datetime-local"
                            className="w-full rounded-lg border border-[#dbdfe6] bg-white text-[#111318] h-12 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            value={formatDateForInput(formData.inicio_habilitado)}
                            onChange={(e) =>
                                setFormData({ ...formData, inicio_habilitado: new Date(e.target.value).toISOString() })
                            }
                        />
                    </label>

                    <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-[#111318]">
                            Estado
                        </span>
                        <div className="relative">
                            <select
                                className="w-full appearance-none rounded-lg border border-[#dbdfe6] bg-white text-[#111318] h-12 px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all cursor-pointer"
                                value={formData.is_active ? "true" : "false"}
                                onChange={(e) =>
                                    setFormData({ ...formData, is_active: e.target.value === "true" })
                                }
                            >
                                <option value="true">Publicado</option>
                                <option value="false">Inactivo</option>
                            </select>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#616f89]">
                                <span className="material-symbols-outlined text-[20px]">
                                    expand_more
                                </span>
                            </span>
                        </div>
                    </label>

                    <div className="flex gap-3 justify-end pt-4 border-t border-[#e5e7eb]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-lg border border-[#dbdfe6] text-[#111318] hover:bg-gray-50 transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2.5 rounded-lg bg-primary hover:bg-blue-700 text-white font-medium transition-colors"
                        >
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
