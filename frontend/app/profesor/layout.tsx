import ProfesorSidebar from "@/components/Profesor/Sidebar";

export default function ProfesorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light text-[#111318] transition-colors duration-200">
      <ProfesorSidebar />
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative scroll-smooth">
        {children}
      </main>
    </div>
  );
}

