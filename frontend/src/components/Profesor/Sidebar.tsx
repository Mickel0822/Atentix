import DashboardSidebar from "@/components/DashboardSidebar";

export default function ProfesorSidebar() {
  return (
    <DashboardSidebar
      subtitle="Panel Profesor"
      navItems={[
        { href: "/profesor", icon: "home", label: "Inicio" },
        { href: "/profesor/clases", icon: "class", label: "Gestión de Clases" },
        { href: "/profesor/subir-video", icon: "video_library", label: "Videos y Evaluaciones" },
        { href: "/profesor/videos", icon: "playlist_play", label: "Lista de Videos" },
        { href: "/profesor/reportes", icon: "bar_chart", label: "Reportes de Resultados" },
      ]}
    />
  );
}
