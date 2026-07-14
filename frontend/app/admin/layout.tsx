import Sidebar from "@/components/Admin/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-background-light text-[#111318] transition-colors duration-200 md:h-screen md:flex-row md:overflow-hidden">
      <Sidebar />
      <main className="relative flex min-w-0 flex-1 flex-col scroll-smooth md:h-full md:overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
