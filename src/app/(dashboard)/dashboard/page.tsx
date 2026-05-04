"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  Crown,
  DollarSign,
  Code2,
  FlaskConical,
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  Megaphone,
  BarChart3,
  RefreshCw,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  AlertCircle,
  XCircle,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { cn, formatRelative } from "@/lib/utils";
import { DEPARTMENTS } from "@/lib/departments";

// ── Types ────────────────────────────────────────────────────────────────────

interface Pipeline {
  total: number;
  new: number;
  contacted: number;
  replied: number;
  interested: number;
  demo_booked: number;
  not_interested: number;
  no_reply: number;
}

interface ActivityItem {
  id: string;
  type: "run" | "email_in" | "email_out" | "lead_new" | "lead_status";
  agentName?: string;
  department?: string;
  title: string;
  description: string;
  status?: string;
  ts: string;
}

interface AgentStatus {
  department: string;
  status: string;
  lastRunAt: string | null;
  summary: string;
}

interface DashboardData {
  pipeline: Pipeline;
  runs24h: number;
  tokensToday: number;
  costTodayUsd: number;
  lastInbound: {
    from: string;
    email: string;
    subject: string;
    preview: string;
    receivedAt: string | null;
  } | null;
  lastTitanRunAt: string | null;
  lastTitanStatus: string | null;
  agentStatus: Record<string, AgentStatus>;
  activity: ActivityItem[];
  suggestedAction: {
    label: string;
    reason: string;
    urgency: "high" | "medium" | "low";
  } | null;
}

// ── Icons & helpers ──────────────────────────────────────────────────────────

const DEPT_ICONS: Record<string, React.ElementType> = {
  command: Crown,
  engineering: Code2,
  sales: TrendingUp,
  marketing: Megaphone,
  analytics: BarChart3,
  operations: Shield,
  finance: DollarSign,
  research: FlaskConical,
};

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  run: Zap,
  email_in: Inbox,
  email_out: Mail,
  lead_new: Users,
  lead_status: Activity,
};

function statusDot(status: string) {
  if (status === "completed") return "bg-status-ok";
  if (status === "failed") return "bg-status-err";
  if (status === "running") return "bg-accent animate-pulse";
  return "bg-status-idle";
}

function agentStatusLabel(s: AgentStatus | undefined) {
  if (!s) return { label: "Idle", color: "text-fg-subtle", dot: "bg-status-idle" };
  if (s.status === "running") return { label: "Kjører", color: "text-accent", dot: "bg-accent animate-pulse" };
  if (s.status === "completed") return { label: "OK", color: "text-status-ok", dot: "bg-status-ok" };
  if (s.status === "failed") return { label: "Feil", color: "text-status-err", dot: "bg-status-err" };
  return { label: "Idle", color: "text-fg-subtle", dot: "bg-status-idle" };
}

// ── Main component ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetch_ = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const headers: Record<string, string> = {};
      const secret = process.env.NEXT_PUBLIC_DASHBOARD_SECRET;
      if (secret) headers["Authorization"] = `Bearer ${secret}`;
      const res = await fetch("/api/dashboard/stats", { headers });
      if (res.ok) {
        const json = await res.json() as DashboardData;
        setData(json);
        setLastRefresh(new Date());
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetch_();
    const interval = setInterval(() => void fetch_(true), 30_000);
    return () => clearInterval(interval);
  }, [fetch_]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-fg-muted" />
      </div>
    );
  }

  const p = data?.pipeline ?? {
    total: 0, new: 0, contacted: 0, replied: 0,
    interested: 0, demo_booked: 0, not_interested: 0, no_reply: 0,
  };

  const hotLeads = p.replied + p.interested;
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "God morgen";
    if (h < 18) return "God ettermiddag";
    return "God kveld";
  })();

  return (
    <div className="px-8 py-7 max-w-[1400px] mx-auto space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs text-fg-muted uppercase tracking-wider mb-1.5">
            Commander
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting}, Markus.
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            {p.total > 0
              ? `${p.total} leads i pipeline · ${hotLeads > 0 ? `${hotLeads} varme` : "ingen svar ennå"}`
              : "Ingen leads ennå — kjør Nova for å starte prospektering"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-fg-subtle">
              Oppdatert {formatRelative(lastRefresh)}
            </span>
          )}
          <button
            onClick={() => void fetch_(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-fg-muted hover:text-fg hover:bg-bg-elevated transition-colors"
          >
            <RefreshCw className={cn("size-3", refreshing && "animate-spin")} />
            Refresh
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-status-ok/30 bg-status-ok/5 text-xs text-status-ok font-medium">
            <span className="size-1.5 rounded-full bg-status-ok animate-pulse" />
            Live
          </div>
        </div>
      </div>

      {/* ── Suggested action ───────────────────────────────────────────── */}
      {data?.suggestedAction && (
        <div className={cn(
          "rounded-xl border px-5 py-4 flex items-center justify-between",
          data.suggestedAction.urgency === "high"
            ? "border-accent/40 bg-accent/5"
            : "border-border bg-bg-surface"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "size-8 rounded-lg flex items-center justify-center",
              data.suggestedAction.urgency === "high"
                ? "bg-accent/10"
                : "bg-bg-elevated"
            )}>
              <AlertCircle className={cn(
                "size-4",
                data.suggestedAction.urgency === "high" ? "text-accent" : "text-fg-muted"
              )} />
            </div>
            <div>
              <div className="text-sm font-medium">{data.suggestedAction.label}</div>
              <div className="text-xs text-fg-muted">{data.suggestedAction.reason}</div>
            </div>
          </div>
          <Link href={"/command" as "/dashboard"} className="flex items-center gap-1 text-xs text-accent hover:underline">
            Gå til Kommando <ArrowRight className="size-3" />
          </Link>
        </div>
      )}

      {/* ── KPI grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Leads i pipeline"
          value={p.total > 0 ? String(p.total) : "—"}
          sublabel={p.total > 0 ? `${p.new} nye, ${p.contacted} kontaktet` : "Kjør Nova for å finne leads"}
          icon={Users}
          highlight={p.total > 0}
        />
        <KpiCard
          label="Svart / Interessert"
          value={hotLeads > 0 ? String(hotLeads) : "—"}
          sublabel={hotLeads > 0
            ? `${p.replied} svart · ${p.interested} interessert`
            : "Ingen svar ennå"}
          icon={MailOpen}
          highlight={hotLeads > 0}
          urgent={hotLeads > 0}
        />
        <KpiCard
          label="Demo booket"
          value={p.demo_booked > 0 ? String(p.demo_booked) : "—"}
          sublabel={p.demo_booked > 0 ? "Sjekk Calendly" : "Målet er første demo"}
          icon={Calendar}
          highlight={p.demo_booked > 0}
        />
        <KpiCard
          label="Runs siste 24t"
          value={data?.runs24h && data.runs24h > 0 ? String(data.runs24h) : "—"}
          sublabel={data?.runs24h && data.runs24h > 0
            ? `$${(data.costTodayUsd ?? 0).toFixed(4)} estimert kost`
            : "Ingen kjøringer ennå"}
          icon={Zap}
        />
      </div>

      {/* ── Main grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-6">

        {/* Left: Departments + last inbound ───────────────────────────── */}
        <div className="col-span-2 space-y-6">

          {/* Last inbound email */}
          {data?.lastInbound ? (
            <div className="surface p-5">
              <div className="flex items-start gap-4">
                <div className="size-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                  <Inbox className="size-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-fg-muted uppercase tracking-wider">
                      Siste inbound e-post
                    </div>
                    <span className="text-xs text-fg-subtle">
                      {data.lastInbound.receivedAt
                        ? formatRelative(new Date(data.lastInbound.receivedAt))
                        : "—"}
                    </span>
                  </div>
                  <div className="text-sm font-semibold">{data.lastInbound.from}</div>
                  <div className="text-sm text-fg-muted mt-0.5">{data.lastInbound.subject}</div>
                  <p className="text-xs text-fg-subtle mt-2 line-clamp-2 leading-relaxed">
                    {data.lastInbound.preview}
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs text-fg-subtle">Titan håndterer</span>
                    {data.lastTitanRunAt && (
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        data.lastTitanStatus === "completed"
                          ? "bg-status-ok/10 text-status-ok"
                          : "bg-bg-elevated text-fg-muted"
                      )}>
                        {data.lastTitanStatus === "completed" ? "✅ Behandlet" : "⏳ Venter"}
                      </span>
                    )}
                    <Link href={"/command" as "/dashboard"} className="text-xs text-accent hover:underline ml-auto flex items-center gap-1">
                      Svar manuelt <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="surface p-5 border-dashed">
              <div className="flex items-center gap-3 text-fg-muted">
                <Inbox className="size-5 text-fg-subtle" />
                <div>
                  <div className="text-sm font-medium">Ingen inbound e-poster ennå</div>
                  <div className="text-xs text-fg-subtle mt-0.5">
                    Når klinikker svarer på Hermes sin outreach, dukker meldingen opp her
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Department cards */}
          <div>
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Imperiet</h2>
                <p className="text-xs text-fg-muted mt-0.5">8 avdelinger</p>
              </div>
              <Link href={"/agents" as "/dashboard"} className="text-xs text-accent hover:underline flex items-center gap-1">
                Se alle agenter <ArrowRight className="size-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {DEPARTMENTS.map((dept) => {
                const Icon = DEPT_ICONS[dept.id] ?? Activity;
                // Pick a representative agent for status display
                const deptAgentNames = Object.entries(data?.agentStatus ?? {})
                  .filter(([, v]) => v.department === dept.id);
                const activeCount = deptAgentNames.filter(
                  ([, v]) => v.status !== "idle"
                ).length;
                const hasError = deptAgentNames.some(([, v]) => v.status === "failed");
                const hasActive = deptAgentNames.some(([, v]) => v.status === "completed" || v.status === "running");

                return (
                  <Link
                    key={dept.id}
                    href={`/agents?dept=${dept.id}`}
                    className="group surface p-5 hover:border-border-strong transition-all hover:bg-bg-elevated"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={cn(
                        "size-9 rounded-lg flex items-center justify-center",
                        dept.bgColor, dept.borderColor, "border"
                      )}>
                        <Icon className={cn("size-4", dept.textColor)} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "size-1.5 rounded-full",
                          hasError ? "bg-status-err" :
                          hasActive ? "bg-status-ok" :
                          "bg-status-idle"
                        )} />
                        <span className="text-xs text-fg-subtle">
                          {hasError ? "Feil" : hasActive ? `${activeCount} aktiv` : "Idle"}
                        </span>
                      </div>
                    </div>
                    <div className={cn("text-xs font-semibold uppercase tracking-wider mb-1", dept.textColor)}>
                      {dept.shortName}
                    </div>
                    <div className="text-sm font-semibold tracking-tight mb-1">
                      {dept.name}
                    </div>
                    <p className="text-xs text-fg-muted leading-relaxed line-clamp-2 mb-3">
                      {dept.description}
                    </p>
                    <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                      <div className="space-y-0.5 flex-1 min-w-0 pr-2">
                        {deptAgentNames.length > 0 ? (
                          deptAgentNames.slice(0, 2).map(([name, status]) => {
                            const { dot, color } = agentStatusLabel(status);
                            return (
                              <div key={name} className="flex items-center gap-1.5 text-xs text-fg-subtle">
                                <span className={cn("size-1.5 rounded-full flex-shrink-0", dot)} />
                                <span className="capitalize truncate">{name}</span>
                                <span className={cn("ml-auto flex-shrink-0", color)}>
                                  {status.lastRunAt
                                    ? formatRelative(new Date(status.lastRunAt))
                                    : "—"}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-xs text-fg-subtle">Ingen kjøringer</span>
                        )}
                      </div>
                      <ArrowRight className="size-4 text-fg-subtle group-hover:text-accent transition-colors shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right sidebar ───────────────────────────────────────────────── */}
        <div className="col-span-1 space-y-5">

          {/* Pipeline funnel */}
          <div className="surface p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-4">
              Sales Pipeline
            </div>
            {p.total === 0 ? (
              <div className="py-6 text-center">
                <Users className="size-8 mx-auto text-fg-subtle mb-2" />
                <div className="text-sm text-fg-muted">Ingen leads ennå</div>
                <div className="text-xs text-fg-subtle mt-1">
                  Trigger Nova for å starte prospektering
                </div>
                <Link
                  href={"/command" as "/dashboard"}
                  className="mt-3 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  Kjør Nova <ArrowRight className="size-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <PipelineRow label="Nye" value={p.new} total={p.total} color="bg-fg-subtle" />
                <PipelineRow label="Kontaktet" value={p.contacted} total={p.total} color="bg-blue-500" />
                <PipelineRow label="Svart" value={p.replied} total={p.total} color="bg-accent" />
                <PipelineRow label="Interessert" value={p.interested} total={p.total} color="bg-yellow-500" />
                <PipelineRow label="Demo booket" value={p.demo_booked} total={p.total} color="bg-status-ok" />
                {(p.not_interested + p.no_reply) > 0 && (
                  <PipelineRow
                    label="Ikke aktuell"
                    value={p.not_interested + p.no_reply}
                    total={p.total}
                    color="bg-status-err/60"
                    muted
                  />
                )}
              </div>
            )}
          </div>

          {/* Activity feed */}
          <div className="surface p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-4">
              Aktivitet
            </div>
            {(data?.activity ?? []).length === 0 ? (
              <div className="py-8 text-center">
                <Activity className="size-8 mx-auto text-fg-subtle mb-2" />
                <div className="text-sm text-fg-muted">Ingenting ennå</div>
                <div className="text-xs text-fg-subtle mt-1 max-w-[200px] mx-auto">
                  Kjøringer, e-poster og leads dukker opp her automatisk
                </div>
              </div>
            ) : (
              <div className="space-y-0 -mx-5">
                {(data?.activity ?? []).slice(0, 12).map((item) => {
                  const Icon = ACTIVITY_ICONS[item.type] ?? Activity;
                  const isInbound = item.type === "email_in";
                  const isError = item.status === "failed";
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex gap-3 px-5 py-3 border-b border-border-subtle last:border-0",
                        isInbound && "bg-accent/3"
                      )}
                    >
                      <div className={cn(
                        "size-6 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                        isInbound ? "bg-accent/15" :
                        isError ? "bg-status-err/10" :
                        "bg-bg-elevated"
                      )}>
                        <Icon className={cn(
                          "size-3.5",
                          isInbound ? "text-accent" :
                          isError ? "text-status-err" :
                          "text-fg-subtle"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-fg leading-snug">
                          {item.title}
                        </div>
                        <div className="text-xs text-fg-subtle mt-0.5 line-clamp-1">
                          {item.description}
                        </div>
                      </div>
                      <div className="text-xs text-fg-subtle whitespace-nowrap ml-1 mt-0.5">
                        {formatRelative(new Date(item.ts))}
                      </div>
                    </div>
                  );
                })}
                <div className="px-5 pt-3">
                  <Link href={"/runs" as "/dashboard"} className="text-xs text-accent hover:underline flex items-center gap-1">
                    Se alle kjøringer <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sublabel,
  icon: Icon,
  highlight = false,
  urgent = false,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon?: React.ElementType;
  highlight?: boolean;
  urgent?: boolean;
}) {
  return (
    <div className={cn(
      "surface p-5",
      urgent && "border-accent/40 bg-accent/3"
    )}>
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium text-fg-muted uppercase tracking-wider">
          {label}
        </div>
        {Icon && <Icon className={cn("size-4", urgent ? "text-accent" : "text-fg-subtle")} />}
      </div>
      <div className="mt-3">
        <div className={cn(
          "text-2xl font-semibold tracking-tight",
          value === "—" ? "text-fg-subtle" : urgent ? "text-accent" : "text-fg"
        )}>
          {value}
        </div>
        {sublabel && (
          <div className="mt-1 text-xs text-fg-subtle">{sublabel}</div>
        )}
      </div>
    </div>
  );
}

function PipelineRow({
  label,
  value,
  total,
  color,
  muted = false,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  muted?: boolean;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={cn(muted ? "text-fg-subtle" : "text-fg-muted")}>{label}</span>
        <span className={cn("font-medium tabular-nums", value === 0 ? "text-fg-subtle" : "text-fg")}>
          {value}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", value > 0 ? color : "bg-transparent")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
