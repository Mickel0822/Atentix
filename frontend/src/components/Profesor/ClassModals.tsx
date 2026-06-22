"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface Class {
  id: string;
  name: string;
  description: string;
  status: "Activo" | "Archivado" | "Borrador";
  students: number;
  videos: number;
  schedule?: string;
  imageUrl?: string;
  accessCode?: string;
}

export function CreateClassModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (classData: Partial<Class>) => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, status: "Activo" });
    setFormData({ name: "", description: "" });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#111318]">
            Crear Nueva Clase
          </h2>
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
              Nombre de la Clase
            </span>
            <input
              className="w-full rounded-lg border border-[#dbdfe6] bg-white text-[#111318] h-12 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              placeholder="Ej: Matemáticas Avanzadas I"
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#111318]">
              Descripción
            </span>
            <textarea
              className="w-full rounded-lg border border-[#dbdfe6] bg-white text-[#111318] min-h-[100px] p-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
              placeholder="Describe el contenido y objetivos de la clase..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
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
              Crear Clase
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditClassModal({
  isOpen,
  onClose,
  classItem,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  classItem: Class | null;
  onSave: (classData: Class) => void;
}) {
  const [formData, setFormData] = useState<Class | null>(classItem);

  // Actualizar el estado cuando cambie classItem o isOpen
  useEffect(() => {
    if (isOpen && classItem) {
      setFormData({ ...classItem });
    }
  }, [isOpen, classItem]);

  if (!isOpen || !formData || !classItem) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#111318]">Editar Clase</h2>
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
              Nombre de la Clase
            </span>
            <input
              className="w-full rounded-lg border border-[#dbdfe6] bg-white text-[#111318] h-12 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#111318]">
              Descripción
            </span>
            <textarea
              className="w-full rounded-lg border border-[#dbdfe6] bg-white text-[#111318] min-h-[100px] p-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#111318]">
              Horario
            </span>
            <input
              className="w-full rounded-lg border border-[#dbdfe6] bg-white text-[#111318] h-12 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              type="text"
              placeholder="Ej: Lunes y Miércoles • 10:00 AM - 12:00 PM"
              value={formData.schedule || ""}
              onChange={(e) =>
                setFormData({ ...formData, schedule: e.target.value })
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
                value={formData.status === "Activo" ? "true" : "false"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value === "true" ? "Activo" : "Archivado"
                  })
                }
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo / Archivado</option>
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

export function CodeModal({
  isOpen,
  onClose,
  classItem,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  classItem: Class | null;
  onSave: (code: string) => void;
}) {
  const [code, setCode] = useState(classItem?.accessCode || "");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isOpen && classItem) {
      setCode(classItem.accessCode || "");
      setIsEditing(false);
    }
  }, [isOpen, classItem]);

  if (!isOpen || !classItem) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code).then(() => {
      alert("Código copiado al portapapeles");
    });
  };

  const handleGenerateRandom = () => {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setCode(newCode);
    setIsEditing(true);
  };

  const handleSave = () => {
    onSave(code);
    setIsEditing(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#111318]">Código de Acceso</h2>
          <button
            onClick={onClose}
            className="text-[#616f89] hover:text-[#111318]"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6 flex flex-col gap-5">
          <div className="text-center">
            <p className="text-sm text-[#616f89] mb-4">
              Código de acceso para la clase:
            </p>
            <p className="text-lg font-semibold text-[#111318] mb-6">
              {classItem.name}
            </p>

            <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-primary/30 flex flex-col items-center gap-4">
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setIsEditing(true);
                }}
                className="text-4xl font-bold text-primary tracking-widest text-center bg-transparent border-b-2 border-transparent focus:border-primary focus:outline-none w-full uppercase"
              />

              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="text-sm text-primary hover:text-blue-700 flex items-center gap-1 font-medium"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    content_copy
                  </span>
                  Copiar código
                </button>
                <button
                  type="button"
                  onClick={handleGenerateRandom}
                  className="text-sm text-primary hover:text-blue-700 flex items-center gap-1 font-medium"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    autorenew
                  </span>
                  Generar Nuevo
                </button>
              </div>
            </div>

            <p className="text-xs text-[#616f89] mt-4">
              Comparte este código con tus estudiantes para que se unan a la clase.
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-[#e5e7eb]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-[#dbdfe6] text-[#111318] font-medium hover:bg-gray-50 transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-lg bg-primary hover:bg-blue-700 text-white font-medium transition-colors shadow-sm"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DeleteClassModal({
  isOpen,
  onClose,
  classItem,
  onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  classItem: Class | null;
  onDelete: () => void;
}) {
  if (!isOpen || !classItem) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#111318]">Eliminar Clase</h2>
          <button
            onClick={onClose}
            className="text-[#616f89] hover:text-[#111318]"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6 flex flex-col gap-5">
          <div className="flex items-center gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <span className="material-symbols-outlined text-red-600">
              warning
            </span>
            <p className="text-sm text-red-700 font-medium">
              Esta acción no se puede deshacer.
            </p>
          </div>
          <p className="text-[#616f89]">
            ¿Estás seguro de que deseas eliminar la clase{" "}
            <strong>{classItem.name}</strong>? Todos los datos asociados serán
            eliminados permanentemente.
          </p>
          <div className="flex gap-3 justify-end pt-4 border-t border-[#e5e7eb]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-[#dbdfe6] text-[#111318] hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
            >
              Eliminar Clase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
