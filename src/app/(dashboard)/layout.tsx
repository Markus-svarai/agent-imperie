import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh">
      {/* Sidebar — skjult på mobil */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      {/* Innhold */}
      <main className="flex-1 overflow-y-auto grid-bg pb-16 md:pb-0">
        {children}
      </main>
      {/* Bunnmeny — kun mobil */}
      <MobileNav />
    </div>
  );
}
