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
    <div className="flex h-screen w-full overflow-hidden bg-background-light text-[#111318] transition-colors duration-200">
      <EstudianteSidebar />
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative scroll-smooth">
        {children}
      </main>
    </div>
  );
}

