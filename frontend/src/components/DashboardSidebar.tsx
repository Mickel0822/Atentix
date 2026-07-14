"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import { createClientSupabase } from "@/utils/supabase/client";

export interface DashboardNavItem {
  href: string;
  icon: string;
  label: string;
}

interface DashboardSidebarProps {
  subtitle: string;
  navItems: DashboardNavItem[];
}

export default function DashboardSidebar({ subtitle, navItems }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => setIsOpen(false), [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const cerrarSesion = async () => {
    setIsLoading(true);
    try {
      await createClientSupabase().auth.signOut();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      router.push("/login");
      setIsLoading(false);
    }
  };

  const isActive = (href: string) =>
    pathname === href ||
    (!["/admin", "/profesor", "/estudiante"].includes(href) && pathname.startsWith(`${href}/`));

  const navigation = (
    <>
      <nav className="mt-4 flex flex-1 flex-col gap-2" aria-label="Navegación principal">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
              isActive(item.href)
                ? "bg-primary/10 text-primary"
                : "text-[#616f89] hover:bg-gray-100 hover:text-[#111318]"
            }`}
          >
            <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
      <button
        className="mt-auto flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
        onClick={cerrarSesion}
        disabled={isLoading}
      >
        <span className={`material-symbols-outlined ${isLoading ? "animate-spin" : ""}`}>
          {isLoading ? "sync" : "logout"}
        </span>
        <span className="text-sm font-medium">{isLoading ? "Cerrando..." : "Cerrar Sesión"}</span>
      </button>
    </>
  );

  return (
    <>
      <header className="mobile-safe-top sticky top-0 z-40 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:hidden">
        <BrandLogo subtitle={subtitle} />
        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 active:bg-slate-200"
          aria-label="Abrir menú principal"
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsOpen(true)}
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      </header>

      <aside className="z-20 hidden w-64 shrink-0 flex-col border-r border-[#e5e7eb] bg-white md:flex">
        <div className="flex h-full flex-col gap-4 p-4">
          <BrandLogo className="px-2 py-3" subtitle={subtitle} />
          {navigation}
        </div>
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            aria-label="Cerrar menú"
            onClick={() => setIsOpen(false)}
          />
          <aside
            id="mobile-navigation"
            className="mobile-safe-y absolute inset-y-0 left-0 flex w-[min(84vw,320px)] flex-col bg-white p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <BrandLogo subtitle={subtitle} />
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
                aria-label="Cerrar menú principal"
                onClick={() => setIsOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {navigation}
          </aside>
        </div>
      )}
    </>
  );
}
