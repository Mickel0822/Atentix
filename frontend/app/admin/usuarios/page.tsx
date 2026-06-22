"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import Header from "@/components/Admin/Header";
import UserTable from "@/components/Admin/UserTable";
import {
  AddUserModal,
  EditUserModal,
  DeleteUserModal,
  ResetPasswordModal,
  UserDetailsModal,
} from "@/components/Admin/UserModals";

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



export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("Todos");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] =
    useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalUsers, setTotalUsers] = useState(0);

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const skip = (currentPage - 1) * pageSize;
        const params: any = { skip, limit: pageSize };
        if (searchTerm) params.search = searchTerm;
        if (roleFilter !== "Todos") params.role = roleFilter;
        if (statusFilter !== "Todos") params.status = statusFilter;

        const res = await api.get("/users/", { params });
        if (res.data) {
          setUsers(res.data.items || []);
          setTotalUsers(res.data.total || 0);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, roleFilter, statusFilter, currentPage, pageSize]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setIsDetailsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    setIsResetPasswordModalOpen(true);
  };

  const handleSaveUser = async (userData: Partial<User>) => {
    if (selectedUser) {
      // Editar usuario existente
      try {
        await api.put(`/users/${selectedUser.id}`, userData);

        // Refresh users
        const params: any = { skip: 0, limit: 100 };
        if (searchTerm) params.search = searchTerm;
        if (roleFilter !== "Todos") params.role = roleFilter;
        if (statusFilter !== "Todos") params.status = statusFilter;

        const res = await api.get("/users/", { params });
        if (res.data && res.data.items) {
          setUsers(res.data.items);
        }
      } catch (error) {
        console.error("Error updating user:", error);
      }
    } else {
      // Crear nuevo usuario
      try {
        await api.post("/users/", {
          name: userData.name,
          email: userData.email,
          password: (userData as any).password,
          role: userData.role,
        });

        // Refresh users
        const params: any = { skip: 0, limit: 100 };
        if (searchTerm) params.search = searchTerm;
        if (roleFilter !== "Todos") params.role = roleFilter;
        if (statusFilter !== "Todos") params.status = statusFilter;

        const res = await api.get("/users/", { params });
        if (res.data && res.data.items) {
          setUsers(res.data.items);
        }
      } catch (error) {
        console.error("Error creating user:", error);
      }
    }
    setSelectedUser(null);
  };

  const handleDeleteUser = async () => {
    if (selectedUser) {
      try {
        await api.delete(`/users/${selectedUser.id}`);

        // Remove from local state immediately
        setUsers(users.filter((u) => u.id !== selectedUser.id));
      } catch (error) {
        console.error("Error deleting user:", error);
      }
      setSelectedUser(null);
    }
  };

  const handleResetPasswordConfirm = (password?: string) => {
    // TODO: Implementar lógica de restablecimiento de contraseña
    console.log("Restablecer contraseña para:", selectedUser?.email, password);
  };

  const handleExportExcel = async () => {
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (roleFilter !== "Todos") params.role = roleFilter;
      if (statusFilter !== "Todos") params.status = statusFilter;

      // Usamos responseType: 'blob' para recibir el archivo binario
      const res = await api.get("/users/export", {
        params,
        responseType: "blob",
      });

      // Crear un link temporal para descargar el archivo
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `usuarios_plataforma_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();

      // Limpieza
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al exportar usuarios:", error);
      alert("Error al generar el archivo Excel");
    }
  };

  return (
    <>
      <Header
        title="Gestión de Usuarios"
        subtitle="Administra el acceso y los roles de los usuarios de la plataforma"
      />
      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-6">
        {/* Page Heading */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-[#111318] text-2xl md:text-3xl font-bold leading-tight tracking-tight">
              Gestión de Usuarios
            </h1>
            <p className="text-[#616f89] text-sm font-normal">
              Crea nuevos perfiles, gestiona permisos y administra el acceso de
              los usuarios.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-lg h-11 px-5 bg-primary hover:bg-blue-700 text-white text-sm font-bold leading-normal tracking-[0.015em] transition-colors shadow-sm shadow-blue-200"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span className="truncate">Añadir Nuevo Usuario</span>
          </button>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-4 rounded-xl border border-[#e5e7eb] shadow-sm">
          {/* Search */}
          <div className="w-full md:max-w-md">
            <div className="relative flex items-center w-full h-10 rounded-lg focus-within:ring-2 focus-within:ring-primary overflow-hidden border border-[#dbdfe6] bg-white">
              <div className="grid place-items-center h-full w-10 text-[#616f89]">
                <span className="material-symbols-outlined text-[20px]">
                  search
                </span>
              </div>
              <input
                className="peer h-full w-full outline-none text-sm text-[#111318] bg-transparent pr-2 placeholder:text-[#9ca3af]"
                id="search"
                placeholder="Buscar por nombre, correo o ID..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Chips / Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group">
              <select
                className="flex h-10 items-center justify-between gap-x-2 rounded-lg bg-[#f0f2f4] hover:bg-[#e5e7eb] px-4 transition-colors min-w-[140px] text-[#111318] text-sm font-medium"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="Todos">Rol: Todos</option>
                <option value="Estudiante">Rol: Estudiante</option>
                <option value="Profesor">Rol: Profesor</option>
                <option value="Admin">Rol: Admin</option>
              </select>
            </div>
            <div className="relative group">
              <select
                className="flex h-10 items-center justify-between gap-x-2 rounded-lg bg-[#f0f2f4] hover:bg-[#e5e7eb] px-4 transition-colors min-w-[150px] text-[#111318] text-sm font-medium"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="Todos">Estado: Todos</option>
                <option value="Activo">Estado: Activo</option>
                <option value="Inactivo">Estado: Inactivo</option>
              </select>
            </div>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#dbdfe6] bg-white text-[#616f89] hover:bg-gray-50 transition-colors"
              title="Exportar a Excel"
              onClick={handleExportExcel}
            >
              <span className="material-symbols-outlined text-[20px]">
                download
              </span>
            </button>
          </div>
        </div>

        {/* Table Section */}
        <UserTable
          users={users}
          totalItems={totalUsers}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          onViewDetails={handleViewDetails}
          onEdit={handleEdit}
          onResetPassword={handleResetPassword}
          onDelete={handleDelete}
        />
      </div>

      {/* Modals */}
      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedUser(null);
        }}
        onSave={handleSaveUser}
      />

      <EditUserModal
        key={selectedUser?.id || "new"}
        isOpen={isEditModalOpen}
        user={selectedUser}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        onSave={handleSaveUser}
      />

      <DeleteUserModal
        isOpen={isDeleteModalOpen}
        user={selectedUser}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedUser(null);
        }}
        onDelete={handleDeleteUser}
      />

      <ResetPasswordModal
        isOpen={isResetPasswordModalOpen}
        user={selectedUser}
        onClose={() => {
          setIsResetPasswordModalOpen(false);
          setSelectedUser(null);
        }}
        onResetPassword={handleResetPasswordConfirm}
      />

      <UserDetailsModal
        isOpen={isDetailsModalOpen}
        user={selectedUser}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedUser(null);
        }}
        onEdit={() => {
          setIsDetailsModalOpen(false);
          setIsEditModalOpen(true);
        }}
      />
    </>
  );
}
