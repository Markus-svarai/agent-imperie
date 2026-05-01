import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Crown, Code2, TrendingUp, Megaphone, BarChart3,
  Shield, DollarSign, FlaskConical, Activity,
  ArrowLeft, Clock, Zap, CheckCircle2, XCircle,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TriggerButton } from "@/components/trigger-button";
import { DEPARTMENT_MAP } from "@/lib/departments";
import { cn, formatRelative } from "@/lib/utils";

const DEPT_ICONS: Record<string, React.ElementType> = {
  command: Crown, engineering: Code2, sales: TrendingUp,
  marketing: Megaphone, analytics: BarChart3, operations: Shield,
  finance: DollarSign, research: FlaskConical,
};

const ROLE_LABELS: Record<string, string> = {
  orchestrator: "Operasjonssjef", strategist: "Strateg",
  intelligence: "Etterretning", coordinator: "Koordinator",
  engineer: "Ingeniør", reviewer: "Reviewer", qa: "QA", devops: "DevOps",
  developer: "Utvikler", researcher: "Researcher", outreach: "Outreach",
  closer: "Closer", crm: "CRM", revenue: "Revenue", content: "Innhold",
  seo: "SEO", brand: "Brand", social: "Sosiale medier", analyst: "Analytiker",
  data: "Data", market: "Marked", synthesizer: "Syntese", guardian: "Vaktmester",
  security: "Sikkerhet", change: "Endring", scheduler: "Planlegger",
  reporter: "Rapportør", cost: "Kostnader", growth: "Vekst",
  product: "Produkt", technical: "Teknologi", knowledge: "Kunnskap",
};

async function getAgentData(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const res = await fetch(`${baseUrl}/api/agents/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getAgentData(id);
  if (!data) notFound();

  const { agent, stats, runs } = data as {
    agent: {
      name: string; department: string; role: string; model: string;
      description: string; schedule: string | null; status: string;
    };
    stats: {
      totalRuns: number; completedRuns: number; successRate: number;
      totalTokens: number; totalCostUsd: number;
    };
    runs: Array<{
      id: string; status: string; trigger: string; startedAt: string | null;
      durationMs: number | null; inputTokens: number; outputTokens: number;
      costMicroUsd: number; summary: string;
    }>;
  };

  const dept = DEPARTMENT_MAP[agent.department as keyof typeof DEPARTMENT_MAP];
  const DeptIcon = DEPT_ICONS[agent.department] ?? Activity;
  const modelLabel = agent.model.includes("opus") ? "opus" : agent.model.includes("haiku") ? "haiku" : "sonnet";

  return (
    <div className="px-8 py-7 max-w-[1200px] mx-auto">
      <Link href="/agents" className="inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg mb-6 transition-colors">
        <ArrowLeft className="size-3.5" /> Tilbake til flåten
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div className={cn("size-12 rounded-xl flex items-center justify-center border", dept?.bgColor, dept?.borderColor)}>
            <DeptIcon className={cn("size-5", dept?.textColor)} />
          </div>
          <div>
            <div className={cn("text-xs font-semibold uppercase tracking-wider mb-1", dept?.textColor)}>
              {dept?.shortName ?? agent.department.toUpperCase()}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{agent.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-fg-muted">{ROLE_LABELS[agent.role] ?? agent.role}</span>
              {agent.schedule && (
                <><span className="text-fg-subtle">·</span><span className="text-xs text-fg-subtle font-mono">{agent.schedule}</span></>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={modelLabel === "opus" ? "accent" : "neutral"}>{modelLabel}</Badge>
          <TriggerButton agentId={id} />
        </div>
      </div>

      {agent.description && (
        <p className="text-sm text-fg-muted leading-relaxed mb-8 max-w-2xl">{agent.description}</p>
      )}

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Totale kjøringer", value: String(stats.totalRuns), Icon: Activity },
          { label: "Suksessrate", value: `${stats.successRate}%`, Icon: CheckCircle2 },
          { label: "Tokens brukt", value: stats.totalTokens.toLocaleString("nb-NO"), Icon: Zap },
          { label: "Total kostnad", value: `$${stats.totalCostUsd.toFixed(4)}`, Icon: DollarSign },
        ].map((kpi) => (
          <div key={kpi.label} className="surface p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-fg-muted">{kpi.label}</span>
              <kpi.Icon className="size-3.5 text-fg-subtle" />
            </div>
            <div className="text-xl font-semibold tracking-tight">{kpi.value}</div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader title="Kjøringshistorikk" description={`Siste ${runs.length} kjøringer`} />
        {runs.length === 0 ? (
          <div className="py-12 text-center">
            <div className="size-10 mx-auto rounded-full bg-bg-elevated border border-border flex items-center justify-center mb-3">
              <Clock className="size-4 text-fg-subtle" />
            </div>
            <div className="text-sm font-medium text-fg-muted">Ingen kjøringer ennå</div>
            <div className="text-xs text-fg-subtle mt-1">Bruk «Kjør nå» eller vent på cron-schedule</div>
          </div>
        ) : (
          <div className="-mx-5 -mb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  {[
                    { h: "Status", right: false }, { h: "Trigger", right: false },
                    { h: "Tid", right: false }, { h: "Varighet", right: true },
                    { h: "Tokens", right: true }, { h: "Kostnad", right: true },
                    { h: "Sammendrag", right: false },
                  ].map(({ h, right }) => (
                    <th key={h} className={cn("px-5 py-2.5 text-xs font-medium text-fg-subtle", right ? "text-right" : "text-left")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {runs.map((run) => (
                  <tr key={run.id} className="hover:bg-bg-elevated transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        {run.status === "completed"
                          ? <CheckCircle2 className="size-3.5 text-status-ok" />
                          : <XCircle className="size-3.5 text-status-error" />}
                        <span className={cn("text-xs", run.status === "completed" ? "text-status-ok" : "text-status-error")}>
                          {run.status === "completed" ? "OK" : "Feil"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3"><span className="text-xs text-fg-muted capitalize">{run.trigger}</span></td>
                    <td className="px-5 py-3"><span className="text-xs text-fg-subtle">{run.startedAt ? formatRelative(new Date(run.startedAt)) : "—"}</span></td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-fg-subtle">
                      {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-fg-subtle">
                      {(run.inputTokens + run.outputTokens).toLocaleString("nb-NO")}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-fg-subtle">
                      ${(run.costMicroUsd / 1_000_000).toFixed(4)}
                    </td>
                    <td className="px-5 py-3 max-w-xs">
                      <p className="text-xs text-fg-muted line-clamp-2 leading-relaxed">{run.summary || "—"}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
