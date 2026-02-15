import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col lg:ml-64">
        <TopBar />
        <main className="flex-1 overflow-y-auto bg-[#f7f7f8] p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
