import DashboardSidebar from "@/components/DashboardSidebar";

export default function Sidebar() {
  return (
    <DashboardSidebar
      subtitle="Panel de Control"
      navItems={[
        { href: "/admin", icon: "dashboard", label: "Dashboard" },
        { href: "/admin/usuarios", icon: "group", label: "Usuarios" },
      ]}
    />
  );
}
