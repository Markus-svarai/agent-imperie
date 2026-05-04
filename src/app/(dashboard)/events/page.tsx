"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

type FeedItem = {
  id: string;
  type: "run" | "email_out" | "email_in" | "booking" | "bounce";
  title: string;
  detail: string;
  ts: string;
  status?: string;
  agent?: string;
};

const TYPE_CONFIG: Record<FeedItem["type"], { icon: string; color: string; bg: string }> = {
  run:       { icon: "⚡", color: "text-violet-400", bg: "bg-violet-500/10" },
  email_out: { icon: "📤", color: "text-blue-400",   bg: "bg-blue-500/10" },
  email_in:  { icon: "📥", color: "text-green-400",  bg: "bg-green-500/10" },
  booking:   { icon: "📅", color: "text-amber-400",  bg: "bg-amber-500/10" },
  bounce:    { icon: "⚠️", color: "text-red-400",    bg: "bg-red-500/10" },
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "akkurat nå";
  if (m < 60) return `${m} min siden`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}t siden`;
  return `${Math.floor(h / 24)}d siden`;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

export default function EventsPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/events?days=${days}`, {
      headers: process.env.NEXT_PUBLIC_DASHBOARD_SECRET
        ? { Authorization: `Bearer ${process.env.NEXT_PUBLIC_DASHBOARD_SECRET}` }
        : {},
    })
      .then(r => r.json())
      .then(d => setItems(d.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [days]);

  // Group by date
  const grouped: Record<string, FeedItem[]> = {};
  for (const item of items) {
    const key = formatDate(item.ts);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  return (
    <div className="px-8 py-7 max-w-[1400px] mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="text-xs text-fg-muted uppercase tracking-wider mb-1.5">Signaler</div>
          <h1 className="text-2xl font-semibold tracking-tight">Hendelser</h1>
          <p className="text-sm text-fg-muted mt-1">
            Agent-kjøringer, e-poster og SvarAI-bookinger i sanntid.
          </p>
        </div>
        <div className="flex gap-1.5 mt-1">
          {[1, 7, 14].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={[
                "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                days === d
                  ? "bg-fg text-bg"
                  : "bg-bg-elevated text-fg-muted hover:text-fg border border-border",
              ].join(" ")}
            >
              {d === 1 ? "I dag" : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card>
          <div className="py-16 text-center text-sm text-fg-muted">Laster hendelser…</div>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <div className="text-sm font-medium">Ingen hendelser</div>
            <div className="text-xs text-fg-muted mt-1.5">
              Agentene har ikke kjørt i denne perioden ennå.
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayItems]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">{date}</span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-fg-subtle">{dayItems.length} hendelser</span>
              </div>
              <Card className="divide-y divide-border">
                {dayItems.map(item => {
                  const cfg = TYPE_CONFIG[item.type];
                  return (
                    <div key={item.id} className="flex items-start gap-4 px-5 py-3.5">
                      <div className={`mt-0.5 size-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0 text-sm`}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-fg">{item.title}</span>
                          {item.status && (
                            <span className={[
                              "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                              item.status === "completed" ? "bg-green-500/15 text-green-400" :
                              item.status === "failed"    ? "bg-red-500/15 text-red-400" :
                              item.status === "pending"   ? "bg-amber-500/15 text-amber-400" :
                              "bg-bg-elevated text-fg-muted"
                            ].join(" ")}>
                              {item.status}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-fg-muted mt-0.5 truncate">{item.detail}</p>
                      </div>
                      <div className="text-xs text-fg-subtle flex-shrink-0 text-right">
                        <div>{formatTime(item.ts)}</div>
                        <div className="text-fg-subtle/60 mt-0.5">{timeAgo(item.ts)}</div>
                      </div>
                    </div>
                  );
                })}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
