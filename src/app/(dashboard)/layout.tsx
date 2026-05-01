import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh">
      <Sidebar />
      <main className="flex-1 overflow-y-auto grid-bg">{children}</main>
    </div>
  );
}
