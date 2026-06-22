"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: "Estudiante" | "Profesor" | "Admin";
  status: "Activo" | "Inactivo";
  lastActivity: string;
  classes?: string[];
  createdAt?: string; // Add optional createdAt for details
}

export function AddUserModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: Partial<User>) => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    status: "Activo",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: formData.name,
      email: formData.email,
      role: formData.role as User["role"],
      status: formData.status as User["status"],
      // @ts-expect-error - password is not part of User but needed for creation
      password: formData.password,
    });
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "",
      status: "Activo",
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#e5e7eb] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#111318]">
            Añadir Nuevo Usuario
          </h2>
          <button
            onClick={onClose}
            className="text-[#616f89] hover:text-[#111318]"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#111318]">
              Nombre Completo
            </label>
            <input
              type="text"
              className="w-full h-11 rounded-lg border border-[#dbdfe6] bg-white text-[#111318] px-4 focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Nombre completo"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#111318]">
              Correo Electrónico
            </label>
            <input
              type="email"
              className="w-full h-11 rounded-lg border border-[#dbdfe6] bg-white text-[#111318] px-4 focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="correo@edu.com"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#111318]">
              Contraseña Temporal
            </label>
            <input
              type="password"
              className="w-full h-11 rounded-lg border border-[#dbdfe6] bg-white text-[#111318] px-4 focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
              required
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
            <p className="text-xs text-[#616f89]">
              El usuario deberá cambiar esta contraseña en su primer inicio de
              sesión.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#111318]">Rol</label>
            <select
              className="w-full h-11 rounded-lg border border-[#dbdfe6] bg-white text-[#111318] px-4 focus:border-primary focus:ring-1 focus:ring-primary"
              required
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
            >
              <option value="">Seleccionar rol</option>
              <option value="Estudiante">Estudiante</option>
              <option value="Profesor">Profesor</option>
              <option value="Admin">Administrador</option>
            </select>
          </div>
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
              Crear Usuario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditUserModal({
  isOpen,
  user,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSave: (user: Partial<User>) => void;
}) {
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    role: string;
    status: string;
  }>(() => {
    if (user) {
      return {
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      };
    }
    return {
      name: "",
      email: "",
      role: "",
      status: "",
    };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      onSave({
        ...user,
        name: formData.name,
        email: formData.email,
        role: formData.role as User["role"],
        status: formData.status as User["status"],
      });
    }
    onClose();
  };

  if (!isOpen || !user) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#e5e7eb] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#111318]">Editar Usuario</h2>
          <button
            onClick={onClose}
            className="text-[#616f89] hover:text-[#111318]"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#111318]">
              Nombre Completo
            </label>
            <input
              type="text"
              className="w-full h-11 rounded-lg border border-[#dbdfe6] bg-white text-[#111318] px-4 focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Nombre completo"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#111318]">
              Correo Electrónico
            </label>
            <input
              type="email"
              className="w-full h-11 rounded-lg border border-[#dbdfe6] bg-white text-[#111318] px-4 focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="correo@edu.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#111318]">Rol</label>
            <select
              className="w-full h-11 rounded-lg border border-[#dbdfe6] bg-white text-[#111318] px-4 focus:border-primary focus:ring-1 focus:ring-primary"
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
            >
              <option value="Estudiante">Estudiante</option>
              <option value="Profesor">Profesor</option>
              <option value="Admin">Administrador</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#111318]">Estado</label>
            <select
              className="w-full h-11 rounded-lg border border-[#dbdfe6] bg-white text-[#111318] px-4 focus:border-primary focus:ring-1 focus:ring-primary"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
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

export function DeleteUserModal({
  isOpen,
  user,
  onClose,
  onDelete,
}: {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onDelete: () => void;
}) {
  if (!isOpen || !user) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#111318]">Eliminar Usuario</h2>
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
            ¿Estás seguro de que deseas eliminar este usuario? Todos sus datos
            serán eliminados permanentemente.
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
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
            >
              Eliminar Usuario
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResetPasswordModal({
  isOpen,
  user,
  onClose,
  onResetPassword,
}: {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onResetPassword: (password?: string) => void;
}) {
  const [password, setPassword] = useState("");

  if (!isOpen || !user) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#111318]">
            Restablecer Contraseña
          </h2>
          <button
            onClick={onClose}
            className="text-[#616f89] hover:text-[#111318]"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6 flex flex-col gap-5">
          <p className="text-[#616f89]">
            ¿Estás seguro de que deseas restablecer la contraseña de este
            usuario? Se enviará una nueva contraseña temporal a su correo
            electrónico.
          </p>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#111318]">
              Nueva Contraseña Temporal
            </label>
            <input
              type="password"
              className="w-full h-11 rounded-lg border border-[#dbdfe6] bg-white text-[#111318] px-4 focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-[#616f89]">
              Dejar en blanco para generar automáticamente.
            </p>
          </div>
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
              onClick={() => {
                onResetPassword(password || undefined);
                setPassword("");
                onClose();
              }}
              className="px-5 py-2.5 rounded-lg bg-primary hover:bg-blue-700 text-white font-medium transition-colors"
            >
              Restablecer Contraseña
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UserDetailsModal({
  isOpen,
  user,
  onClose,
  onEdit,
}: {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [details, setDetails] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      const fetchDetails = async () => {
        setLoading(true);
        try {
          const res = await api.get(`/users/${user.id}`);
          if (res.data) {
            setDetails({ ...user, ...res.data });
          }
        } catch (error) {
          console.error("Error details:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchDetails();
    } else {
      setDetails(null);
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const isProfessor = user.role === "Profesor";
  const isAdmin = user.role === "Admin";

  // Use details if available, otherwise fallback to user prop
  const displayUser = details || user;

  const getRoleBadge = (role: User["role"]) => {
    const styles = {
      Estudiante: "bg-blue-50 text-blue-700 border-blue-100",
      Profesor: "bg-purple-50 text-purple-700 border-purple-100",
      Admin: "bg-indigo-50 text-indigo-700 border-indigo-100",
    };

    const icons = {
      Estudiante: "school",
      Profesor: "cast_for_education",
      Admin: "admin_panel_settings",
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${styles[role]}`}
      >
        <span className="material-symbols-outlined text-[14px]">
          {icons[role]}
        </span>
        {role}
      </span>
    );
  };

  const getStatusBadge = (status: User["status"]) => {
    const styles = {
      Activo: "bg-green-50 text-green-700",
      Inactivo: "bg-gray-100 text-gray-600",
    };

    const dotColors = {
      Activo: "bg-green-500",
      Inactivo: "bg-gray-400",
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status]}`}
      >
        <span className={`size-1.5 rounded-full ${dotColors[status]}`}></span>
        {status}
      </span>
    );
  };



  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#e5e7eb] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#111318]">
            Detalles del Usuario
          </h2>
          <button
            onClick={onClose}
            className="text-[#616f89] hover:text-[#111318]"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6 flex flex-col gap-6">
          {/* User Info Section */}
          <div className="flex items-start gap-4 pb-6 border-b border-[#e5e7eb]">
            <div className="size-16 rounded-full bg-gray-200 border-2 border-gray-200 flex items-center justify-center text-2xl font-bold text-gray-600">
              {displayUser.name
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-[#111318] mb-1">
                {displayUser.name}
              </h3>
              <p className="text-[#616f89] mb-2">{displayUser.email}</p>
              <div className="flex items-center gap-3">
                {getRoleBadge(displayUser.role)}
                {getStatusBadge(displayUser.status)}
              </div>
            </div>
          </div>

          {/* Classes Section */}
          <div>
            <h4 className="text-lg font-bold text-[#111318] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                class
              </span>
              <span>
                {isAdmin
                  ? "Información del Administrador"
                  : isProfessor
                    ? "Clases Creadas"
                    : "Clases Inscritas"}
              </span>
            </h4>
            {isAdmin ? (
              <p className="text-[#616f89]">
                Este usuario tiene acceso completo al sistema de administración.
              </p>
            ) : loading ? (
              <div className="text-center py-4 text-gray-400">Cargando clases...</div>
            ) : displayUser.classes && displayUser.classes.length > 0 ? (
              <div className="flex flex-col gap-3">
                {displayUser.classes.map((className: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-[#e5e7eb]"
                  >
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <span className="material-symbols-outlined text-primary">
                        {isProfessor ? "class" : "menu_book"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#111318]">
                        {className}
                      </p>
                      <p className="text-xs text-[#616f89]">
                        {isProfessor
                          ? "Profesor a cargo"
                          : "Estudiante inscrito"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#616f89]">
                <span className="material-symbols-outlined text-4xl mb-2 block">
                  class
                </span>
                <p>No hay clases registradas</p>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#e5e7eb]">
            <div>
              <p className="text-xs text-[#616f89] mb-1">Fecha de Registro</p>
              <p className="text-sm font-medium text-[#111318]">
                {(displayUser as any).createdAt || "No disponible"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#616f89] mb-1">Última Actividad</p>
              <p className="text-sm font-medium text-[#111318]">
                {displayUser.lastActivity}
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-[#e5e7eb]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-[#dbdfe6] text-[#111318] hover:bg-gray-50 transition-colors font-medium"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => {
                onEdit();
              }}
              className="px-5 py-2.5 rounded-lg bg-primary hover:bg-blue-700 text-white font-medium transition-colors"
            >
              Editar Usuario
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
