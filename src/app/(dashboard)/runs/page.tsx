import {
  Activity,
  Zap,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  Crown,
  Code2,
  TrendingUp,
  Megaphone,
  BarChart3,
  Shield,
  FlaskConical,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatRelative } from "@/lib/utils";

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

const DEPT_COLORS: Record<string, string> = {
  command: "text-violet-400",
  engineering: "text-blue-400",
  sales: "text-emerald-400",
  marketing: "text-pink-400",
  analytics: "text-amber-400",
  operations: "text-slate-400",
  finance: "text-green-400",
  research: "text-cyan-400",
};

interface Run {
  id: string;
  agentName: string;
  department: string;
  model: string;
  status: string;
  trigger: string;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  inputTokens: number;
  outputTokens: number;
  costMicroUsd: number;
  summary: string;
}

async function getRuns(): Promise<Run[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
    const res = await fetch(`${baseUrl}/api/runs?limit=50`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.runs ?? [];
  } catch {
    return [];
  }
}

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function formatCost(microUsd: number): string {
  const usd = microUsd / 1_000_000;
  if (usd < 0.0001) return "<$0.0001";
  return `$${usd.toFixed(4)}`;
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default async function RunsPage() {
  const runs = await getRuns();
  const hasRuns = runs.length > 0;

  // Aggregate stats
  const totalTokens = runs.reduce((s, r) => s + r.inputTokens + r.outputTokens, 0);
  const totalCostUsd = runs.reduce((s, r) => s + r.costMicroUsd / 1_000_000, 0);
  const successRate = runs.length > 0
    ? Math.round((runs.filter((r) => r.status === "completed").length / runs.length) * 100)
    : 0;

  return (
    <div className="px-8 py-7 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-xs text-fg-muted uppercase tracking-wider mb-1.5">
            Aktivitet
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Kjøringer</h1>
          <p className="text-sm text-fg-muted mt-1">
            Automatisk logget — input, output og kostnad for hvert agent-kall.
          </p>
        </div>
        <Badge variant={hasRuns ? "ok" : "idle"}>
          {hasRuns ? `${runs.length} kjøringer` : "Ingen ennå"}
        </Badge>
      </div>

      {/* KPI row */}
      {hasRuns && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="surface p-4">
            <div className="text-xs text-fg-muted mb-1">Totale kjøringer</div>
            <div className="text-2xl font-semibold">{runs.length}</div>
          </div>
          <div className="surface p-4">
            <div className="text-xs text-fg-muted mb-1">Success rate</div>
            <div className="text-2xl font-semibold">{successRate}%</div>
          </div>
          <div className="surface p-4">
            <div className="text-xs text-fg-muted mb-1">Tokens totalt</div>
            <div className="text-2xl font-semibold">
              {totalTokens >= 1000
                ? `${(totalTokens / 1000).toFixed(1)}k`
                : totalTokens.toLocaleString("nb-NO")}
            </div>
          </div>
          <div className="surface p-4">
            <div className="text-xs text-fg-muted mb-1">Totalkostnad</div>
            <div className="text-2xl font-semibold">${totalCostUsd.toFixed(4)}</div>
          </div>
        </div>
      )}

      {/* Runs table */}
      <Card>
        <CardHeader
          title="Alle kjøringer"
          description={hasRuns ? "Siste 50 · oppdateres hvert 30. sekund" : "Venter på første kjøring"}
        />

        {!hasRuns ? (
          <div className="py-16 text-center">
            <div className="size-12 mx-auto rounded-full bg-bg-elevated border border-border flex items-center justify-center mb-4">
              <Activity className="size-5 text-fg-subtle" />
            </div>
            <div className="text-sm font-medium">Ingen kjøringer ennå</div>
            <div className="text-xs text-fg-muted mt-1.5 max-w-sm mx-auto">
              Agentene kjører etter cron-schedule. Første kjøring dukker opp her automatisk.
            </div>
          </div>
        ) : (
          <div className="-mx-5 -mb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left text-xs font-medium text-fg-subtle px-5 py-2.5">Agent</th>
                  <th className="text-left text-xs font-medium text-fg-subtle px-3 py-2.5">Status</th>
                  <th className="text-left text-xs font-medium text-fg-subtle px-3 py-2.5 hidden md:table-cell">Sammendrag</th>
                  <th className="text-right text-xs font-medium text-fg-subtle px-3 py-2.5 hidden lg:table-cell">Tokens</th>
                  <th className="text-right text-xs font-medium text-fg-subtle px-3 py-2.5 hidden lg:table-cell">Kost</th>
                  <th className="text-right text-xs font-medium text-fg-subtle px-3 py-2.5 hidden lg:table-cell">Varighet</th>
                  <th className="text-right text-xs font-medium text-fg-subtle px-5 py-2.5">Tid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {runs.map((run) => {
                  const Icon = DEPT_ICONS[run.department] ?? Activity;
                  const color = DEPT_COLORS[run.department] ?? "text-fg-subtle";
                  return (
                    <tr key={run.id} className="hover:bg-bg-elevated transition-colors">
                      {/* Agent */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("size-7 rounded-lg bg-bg-elevated border border-border flex items-center justify-center flex-shrink-0")}>
                            <Icon className={cn("size-3.5", color)} />
                          </div>
                          <div>
                            <div className="font-medium text-sm leading-none">{run.agentName}</div>
                            <div className="text-xs text-fg-subtle mt-0.5 capitalize">{run.department}</div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          {run.status === "completed" ? (
                            <CheckCircle2 className="size-3.5 text-status-ok flex-shrink-0" />
                          ) : (
                            <XCircle className="size-3.5 text-status-error flex-shrink-0" />
                          )}
                          <span className={cn(
                            "text-xs",
                            run.status === "completed" ? "text-status-ok" : "text-status-error"
                          )}>
                            {run.status === "completed" ? "OK" : "Feil"}
                          </span>
                        </div>
                      </td>

                      {/* Summary */}
                      <td className="px-3 py-3 hidden md:table-cell max-w-xs">
                        <p className="text-xs text-fg-muted line-clamp-2 leading-relaxed">
                          {run.summary || "—"}
                        </p>
                      </td>

                      {/* Tokens */}
                      <td className="px-3 py-3 text-right hidden lg:table-cell">
                        <div className="flex items-center justify-end gap-1 text-xs text-fg-subtle">
                          <Zap className="size-3" />
                          {formatTokens(run.inputTokens + run.outputTokens)}
                        </div>
                      </td>

                      {/* Cost */}
                      <td className="px-3 py-3 text-right hidden lg:table-cell">
                        <span className="text-xs text-fg-subtle">
                          {formatCost(run.costMicroUsd)}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="px-3 py-3 text-right hidden lg:table-cell">
                        <div className="flex items-center justify-end gap-1 text-xs text-fg-subtle">
                          <Clock className="size-3" />
                          {formatDuration(run.durationMs)}
                        </div>
                      </td>

                      {/* Time */}
                      <td className="px-5 py-3 text-right">
                        <span className="text-xs text-fg-subtle whitespace-nowrap">
                          {run.startedAt ? formatRelative(new Date(run.startedAt)) : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
