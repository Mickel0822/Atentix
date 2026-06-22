"use client";

import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import MFADropdown from "./MFADropdown";

interface HeaderProps {
  title: string | React.ReactNode;
  subtitle?: string;
  user?: {
    name: string;
    email: string;
    role: string;
  };
}

export default function Header({ title, subtitle, user: propUser }: HeaderProps) {
  const { user: hookUser, loading } = useCurrentUser();

  // Si nos pasan un usuario por props, usamos ese (asumiendo que viene formateado)
  // Si no, usamos el del hook (que es el objeto User de Supabase)
  const user = hookUser;
  const [showDropdown, setShowDropdown] = useState(false);

  // Cerrar dropdown al presionar Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [showDropdown]);

  if (loading && !propUser) {
    return (
      <header className="sticky top-0 z-10 w-full bg-white/80 backdrop-blur-md border-b border-[#e5e7eb] px-6 py-3 flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-[#111318]">{title}</h2>
          {subtitle && <p className="text-xs text-[#616f89]">{subtitle}</p>}
        </div>
        <div className="size-8 rounded-full bg-gray-200 animate-pulse"></div>
      </header>
    );
  }

  // Lógica para determinar datos a mostrar
  let displayName = "Usuario";
  let displayRole = "Usuario";
  let avatarUrl = undefined;
  let email = "";

  if (propUser) {
    displayName = propUser.name;
    displayRole = propUser.role;
    email = propUser.email;
  } else if (user) {
    displayName =
      user?.user_metadata?.name ||
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      "Usuario";

    displayRole =
      user?.app_metadata?.role === 1
        ? "Administrador"
        : user?.app_metadata?.role === 2
          ? "Profesor"
          : user?.app_metadata?.role === 3
            ? "Estudiante"
            : "Usuario";

    avatarUrl = user?.user_metadata?.avatar_url;
    email = user?.email || "";
  }

  const userProfile = {
    name: displayName,
    email: email,
    role: displayRole,
    avatar: avatarUrl,
  };

  return (
    <header className="sticky top-0 z-10 w-full bg-white/80 backdrop-blur-md border-b border-[#e5e7eb] px-6 py-3 flex items-center justify-between">
      <div className="flex flex-col">
        <h2 className="text-xl font-bold text-[#111318]">{title}</h2>
        {subtitle && <p className="text-xs text-[#616f89]">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        {/* Profile */}
        <div className="relative">
          <div
            className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1.5 rounded-lg transition-colors"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            {avatarUrl ? (
              <div
                className="size-8 rounded-full bg-cover bg-center border border-gray-200"
                style={{ backgroundImage: `url(${avatarUrl})` }}
              ></div>
            ) : (
              <div className="size-8 rounded-full bg-gray-200 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                {displayName
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
            )}
            <div className="hidden lg:flex flex-col">
              <span className="text-xs font-semibold text-[#111318]">
                {displayName}
              </span>
              <span className="text-[10px] text-[#616f89]">{displayRole}</span>
            </div>
            <span
              className={`material-symbols-outlined text-sm text-gray-500 transition-transform ${showDropdown ? "rotate-180" : ""
                }`}
            >
              expand_more
            </span>
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <MFADropdown
              user={userProfile}
              onClose={() => setShowDropdown(false)}
            />
          )}
        </div>
      </div>
    </header>
  );
}
