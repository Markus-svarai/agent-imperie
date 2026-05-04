"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Activity,
  FileText,
  Bell,
  Settings,
  Sparkles,
  Crown,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV: Array<{ href: string; label: string; icon: React.ElementType }> = [
  { href: "/dashboard", label: "Oversikt", icon: LayoutDashboard },
  { href: "/command", label: "Kommando", icon: MessageSquare },
  { href: "/agents", label: "Agenter", icon: Users },
  { href: "/runs", label: "Kjøringer", icon: Activity },
  { href: "/artifacts", label: "Resultater", icon: FileText },
  { href: "/proposals", label: "Athenas forslag", icon: Crown },
  { href: "/events", label: "Hendelser", icon: Bell },
  { href: "/settings", label: "Innstillinger", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-bg-subtle flex flex-col">
      <div className="px-5 py-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center shadow-glow">
            <Sparkles className="size-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">
              Markus sine slaver
            </div>
            <div className="text-[11px] text-fg-subtle uppercase tracking-wider">
              Commander
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href as "/dashboard"}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-bg-elevated text-fg"
                  : "text-fg-muted hover:text-fg hover:bg-bg-surface"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-full bg-bg-elevated border border-border flex items-center justify-center text-xs font-medium">
            M
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">Markus</div>
            <div className="text-xs text-fg-subtle truncate">Operasjonssjef</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
