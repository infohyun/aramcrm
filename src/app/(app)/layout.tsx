import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ThemeProvider from "@/components/ThemeProvider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className="flex h-screen dark:bg-gray-900">
        <Sidebar />
        <div className="flex flex-1 flex-col lg:ml-64">
          <TopBar />
          <main className="flex-1 overflow-y-auto bg-[#f7f7f8] dark:bg-gray-900 p-8">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
