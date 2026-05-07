"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Activity,
  Phone,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Oversikt",  icon: LayoutDashboard },
  { href: "/brief",     label: "Brief",     icon: ClipboardList },
  { href: "/ringer",    label: "Ringer",    icon: Phone },
  { href: "/command",   label: "Kommando",  icon: MessageSquare },
  { href: "/runs",      label: "Kjøringer", icon: Activity },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-subtle border-t border-border">
      <div className="flex items-stretch h-14">
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
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors",
                isActive ? "text-accent" : "text-fg-subtle"
              )}
            >
              <Icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
