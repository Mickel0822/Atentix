import DashboardSidebar from "@/components/DashboardSidebar";

export default function EstudianteSidebar() {
  return (
    <DashboardSidebar
      subtitle="Panel Estudiante"
      navItems={[
        { href: "/estudiante", icon: "home", label: "Inicio" },
        { href: "/estudiante/clases", icon: "group_add", label: "Mis Clases" },
        { href: "/estudiante/resultados", icon: "analytics", label: "Resultados" },
      ]}
    />
  );
}
