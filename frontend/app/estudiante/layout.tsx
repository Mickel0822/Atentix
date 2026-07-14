"use client";

import { usePathname } from "next/navigation";
import EstudianteSidebar from "@/components/Estudiante/Sidebar";

export default function EstudianteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Ocultar sidebar en la página de video
  const isVideoPage = pathname?.includes("/videos/") && pathname?.split("/").length > 5;

  if (isVideoPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-dvh w-full flex-col bg-background-light text-[#111318] transition-colors duration-200 md:h-screen md:flex-row md:overflow-hidden">
      <EstudianteSidebar />
      <main className="relative flex min-w-0 flex-1 flex-col scroll-smooth md:h-full md:overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

