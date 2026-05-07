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
  Crown,
  MessageSquare,
  ClipboardList,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV: Array<{ href: string; label: string; icon: React.ElementType }> = [
  { href: "/dashboard",  label: "Oversikt",       icon: LayoutDashboard },
  { href: "/brief",      label: "Daglig brief",    icon: ClipboardList },
  { href: "/ringer",     label: "Ring-liste",       icon: Phone },
  { href: "/command",    label: "Kommando",         icon: MessageSquare },
  { href: "/agents",     label: "Agenter",          icon: Users },
  { href: "/runs",       label: "Kjøringer",        icon: Activity },
  { href: "/artifacts",  label: "Resultater",       icon: FileText },
  { href: "/proposals",  label: "Athenas forslag",  icon: Crown },
  { href: "/events",     label: "Hendelser",        icon: Bell },
  { href: "/settings",   label: "Innstillinger",    icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-bg-subtle flex flex-col">
      <div className="px-5 py-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="size-8 shrink-0">
            <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" width="32" height="32">
              <rect width="96" height="96" rx="20" fill="#0b0c1a"/>
              <polygon points="48,10 80,28 80,64 48,82 16,64 16,28" fill="none" stroke="#1e1f3a" strokeWidth="1.5"/>
              <polygon points="48,22 70,34 70,58 48,70 26,58 26,34" fill="none" stroke="#2d2f5a" strokeWidth="1"/>
              <polyline points="33,67 48,27 63,67" fill="none" stroke="url(#sg)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="40" y1="51" x2="56" y2="51" stroke="url(#sg)" strokeWidth="4" strokeLinecap="round"/>
              <circle cx="48" cy="10" r="2" fill="#a78bfa"/>
              <circle cx="80" cy="28" r="2" fill="#a78bfa" opacity="0.6"/>
              <circle cx="80" cy="64" r="2" fill="#6366f1" opacity="0.6"/>
              <circle cx="48" cy="82" r="2" fill="#a78bfa"/>
              <circle cx="16" cy="64" r="2" fill="#6366f1" opacity="0.6"/>
              <circle cx="16" cy="28" r="2" fill="#a78bfa" opacity="0.6"/>
              <defs>
                <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a78bfa"/>
                  <stop offset="100%" stopColor="#6366f1"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">
              Agent Imperie
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
