"use client";

import { useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: "Estudiante" | "Profesor" | "Admin";
  status: "Activo" | "Inactivo";
  lastActivity: string;
  avatar?: string;
  classes?: string[];
}

interface UserTableProps {
  users: User[];
  totalItems: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onViewDetails: (user: User) => void;
  onEdit: (user: User) => void;
  onResetPassword: (user: User) => void;
  onDelete: (user: User) => void;
}

export default function UserTable({
  users,
  totalItems,
  pageSize,
  currentPage,
  onPageChange,
  onPageSizeChange,
  onViewDetails,
  onEdit,
  onResetPassword,
  onDelete,
}: UserTableProps) {
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const totalPages = Math.ceil(totalItems / pageSize);
  const startRange = (currentPage - 1) * pageSize + 1;
  const endRange = Math.min(currentPage * pageSize, totalItems);

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)));
    }
  };

  const toggleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

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
    <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#e5e7eb] bg-gray-50">
              <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-[#616f89] w-[60px]">
                <input
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                  type="checkbox"
                  checked={
                    selectedUsers.size === users.length && users.length > 0
                  }
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-[#616f89] min-w-[250px]">
                Usuario
              </th>
              <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-[#616f89] min-w-[150px]">
                Rol
              </th>
              <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-[#616f89] min-w-[120px]">
                Estado
              </th>
              <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-[#616f89] min-w-[180px]">
                Última Actividad
              </th>
              <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-[#616f89] text-right min-w-[120px]">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb]">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#616f89]">
                  No se encontraron usuarios.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="group hover:bg-[#f9fafb] transition-colors"
                >
                  <td className="py-4 px-6">
                    <input
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={() => toggleSelectUser(user.id)}
                    />
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        {user.avatar ? (
                          <div
                            className="size-10 rounded-full bg-cover bg-center border border-gray-200"
                            style={{ backgroundImage: `url(${user.avatar})` }}
                          ></div>
                        ) : (
                          <div className="size-10 rounded-full bg-gray-100 text-gray-500 font-bold flex items-center justify-center border border-gray-200">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                        )}
                        <div
                          className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-white ${user.status === "Activo"
                              ? "bg-green-500"
                              : "bg-gray-400"
                            }`}
                        ></div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#111318]">
                          {user.name}
                        </span>
                        <span className="text-sm text-[#616f89]">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">{getRoleBadge(user.role)}</td>
                  <td className="py-4 px-6">{getStatusBadge(user.status)}</td>
                  <td className="py-4 px-6 text-sm text-[#111318]">
                    {user.lastActivity}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="size-8 flex items-center justify-center rounded-lg text-[#616f89] hover:text-green-600 hover:bg-green-50 transition-colors"
                        title="Ver Detalles"
                        onClick={() => onViewDetails(user)}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          visibility
                        </span>
                      </button>
                      <button
                        className="size-8 flex items-center justify-center rounded-lg text-[#616f89] hover:text-primary hover:bg-blue-50 transition-colors"
                        title="Ver/Editar"
                        onClick={() => onEdit(user)}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          edit
                        </span>
                      </button>
                      <button
                        className="size-8 flex items-center justify-center rounded-lg text-[#616f89] hover:text-orange-600 hover:bg-orange-50 transition-colors"
                        title="Restablecer Contraseña"
                        onClick={() => onResetPassword(user)}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          lock_reset
                        </span>
                      </button>
                      <button
                        className="size-8 flex items-center justify-center rounded-lg text-[#616f89] hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar"
                        onClick={() => onDelete(user)}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          delete
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div className="border-t border-[#e5e7eb] p-4 bg-white flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 text-sm text-[#616f89]">
          <span>Mostrar</span>
          <select
            className="h-8 rounded border-gray-300 bg-transparent text-[#111318] text-sm focus:border-primary focus:ring-primary"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span>filas por página</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#616f89]">
            Mostrando
            <span className="font-bold text-[#111318]">
              {" "}
              {totalItems === 0 ? 0 : startRange}-{endRange}{" "}
            </span>
            de
            <span className="font-bold text-[#111318]"> {totalItems} </span>
          </span>
          <div className="flex items-center gap-1">
            <button
              className="size-8 flex items-center justify-center rounded hover:bg-gray-100 text-[#616f89] disabled:opacity-50"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <span className="material-symbols-outlined text-[20px]">
                chevron_left
              </span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                // Show current, first, last, and neighbors
                return (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                );
              })
              .map((page, index, array) => (
                <div key={page} className="flex items-center">
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span className="px-1 text-[#616f89]">...</span>
                  )}
                  <button
                    onClick={() => onPageChange(page)}
                    className={`size-8 flex items-center justify-center rounded text-sm font-bold transition-colors ${currentPage === page
                        ? "bg-primary text-white"
                        : "hover:bg-gray-100 text-[#616f89]"
                      }`}
                  >
                    {page}
                  </button>
                </div>
              ))}

            <button
              className="size-8 flex items-center justify-center rounded hover:bg-gray-100 text-[#616f89] disabled:opacity-50"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <span className="material-symbols-outlined text-[20px]">
                chevron_right
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
