import {
  Activity,
  DollarSign,
  Sparkles,
  Zap,
  Crown,
  Code2,
  TrendingUp,
  Megaphone,
  BarChart3,
  Shield,
  FlaskConical,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import {
  MOCK_AGENTS,
  AGENTS_BY_DEPARTMENT,
  MOCK_RECENT_RUNS,
} from "@/lib/mock-data";
import { DEPARTMENTS } from "@/lib/departments";
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

export default function DashboardPage() {
  const activeAgents = MOCK_AGENTS.filter((a) => a.status === "active").length;
  const totalAgents = MOCK_AGENTS.length;
  const opusAgents = MOCK_AGENTS.filter((a) => a.model === "opus").length;

  return (
    <div className="px-8 py-7 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-xs text-fg-muted uppercase tracking-wider mb-1.5">
            Commander
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            God morgen, Markus.
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            {totalAgents} agenter · 8 avdelinger · {opusAgents} på Opus.{" "}
            Imperiet venter på runtime.
          </p>
        </div>
        <Badge variant="warn">Fase 1 · Fundament</Badge>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatTile
          label="Agenter totalt"
          value={`${totalAgents}`}
          sublabel={`${activeAgents} aktive nå`}
          icon={Sparkles}
        />
        <StatTile
          label="Avdelinger"
          value="8"
          sublabel="Command til Research"
          icon={Activity}
        />
        <StatTile
          label="Tokens brukt"
          value="0"
          sublabel="Runtime ikke aktivert ennå"
          icon={Zap}
        />
        <StatTile
          label="Kostnad i dag"
          value="$0.00"
          sublabel="Estimert mikro-USD"
          icon={DollarSign}
        />
      </div>

      {/* Department grid + sidebar */}
      <div className="grid grid-cols-3 gap-6">
        {/* Department cards */}
        <div className="col-span-2">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                Imperiet
              </h2>
              <p className="text-xs text-fg-muted mt-0.5">
                8 avdelinger · {totalAgents} agenter i flåten
              </p>
            </div>
            <Link
              href="/agents"
              className="text-xs text-accent hover:underline flex items-center gap-1"
            >
              Se alle agenter <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {DEPARTMENTS.map((dept) => {
              const agents = AGENTS_BY_DEPARTMENT[dept.id] ?? [];
              const active = agents.filter((a) => a.status === "active").length;
              const Icon = DEPT_ICONS[dept.id] ?? Activity;
              return (
                <Link
                  key={dept.id}
                  href={`/agents?dept=${dept.id}`}
                  className={cn(
                    "group surface p-5 hover:border-border-strong transition-all hover:bg-bg-elevated"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={cn(
                        "size-9 rounded-lg flex items-center justify-center",
                        dept.bgColor,
                        dept.borderColor,
                        "border"
                      )}
                    >
                      <Icon className={cn("size-4", dept.textColor)} />
                    </div>
                    <span className="text-xs text-fg-subtle">
                      {agents.length} agenter
                    </span>
                  </div>

                  <div className={cn("text-xs font-semibold uppercase tracking-wider mb-1", dept.textColor)}>
                    {dept.shortName}
                  </div>
                  <div className="text-sm font-semibold tracking-tight mb-1">
                    {dept.name}
                  </div>
                  <p className="text-xs text-fg-muted leading-relaxed line-clamp-2 mb-4">
                    {dept.description}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                    <div className="flex items-center gap-3 text-xs text-fg-subtle">
                      <div className="flex -space-x-1">
                        {agents.slice(0, 4).map((a) => (
                          <div
                            key={a.id}
                            className={cn(
                              "size-5 rounded-full border border-bg-surface flex items-center justify-center text-[9px] font-bold",
                              dept.bgColor,
                              dept.textColor
                            )}
                          >
                            {a.name[0]}
                          </div>
                        ))}
                        {agents.length > 4 && (
                          <div className="size-5 rounded-full bg-bg-elevated border border-bg-surface flex items-center justify-center text-[9px] text-fg-subtle">
                            +{agents.length - 4}
                          </div>
                        )}
                      </div>
                      <span>
                        {active > 0 ? `${active} aktiv` : "Alle idle"}
                      </span>
                    </div>
                    <ArrowRight className="size-4 text-fg-subtle group-hover:text-accent transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-1 space-y-6">
          {/* Activity feed */}
          <Card>
            <CardHeader
              title="Aktivitetsfeed"
              description="Siste hendelser fra flåten"
            />
            {MOCK_RECENT_RUNS.length === 0 ? (
              <div className="py-12 text-center">
                <div className="size-10 mx-auto rounded-full bg-bg-elevated border border-border flex items-center justify-center mb-3">
                  <Activity className="size-4 text-fg-subtle" />
                </div>
                <div className="text-sm font-medium text-fg-muted">
                  Ingen kjøringer ennå
                </div>
                <div className="text-xs text-fg-subtle mt-1 max-w-[220px] mx-auto">
                  Når runtime kobles på i Fase 2 dukker hver kjøring opp her i
                  sanntid.
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-border-subtle -mx-5">
                {MOCK_RECENT_RUNS.map((run) => (
                  <li key={run.id} className="px-5 py-3 hover:bg-bg-elevated">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{run.agentName}</div>
                        <div className="text-xs text-fg-muted line-clamp-1">
                          {run.summary}
                        </div>
                      </div>
                      <div className="text-xs text-fg-subtle whitespace-nowrap ml-3">
                        {formatRelative(run.startedAt)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Fleet breakdown */}
          <Card>
            <CardHeader title="Flåteoversikt" description="Agenter per modell" />
            <div className="space-y-2 text-sm">
              {(["opus", "sonnet", "haiku"] as const).map((model) => {
                const count = MOCK_AGENTS.filter((a) => a.model === model).length;
                const pct = Math.round((count / totalAgents) * 100);
                return (
                  <div key={model}>
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className="text-fg-muted capitalize">{model}</span>
                      <span className="text-fg-subtle">
                        {count} · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          model === "opus"
                            ? "bg-accent"
                            : model === "sonnet"
                            ? "bg-blue-500"
                            : "bg-fg-subtle"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Phase tracker */}
          <Card className="bg-gradient-to-br from-bg-surface to-bg-elevated border-accent/20">
            <CardHeader title="Neste fase" description="Fundamentet er på plass" />
            <div className="space-y-2.5 text-sm">
              <FaseStep label="Fase 1 · Fundament + 32 agenter" status="done" />
              <FaseStep label="Fase 2 · Runtime (Inngest)" status="next" />
              <FaseStep label="Fase 3 · Supabase + historikk" status="todo" />
              <FaseStep label="Fase 4 · Ekte datakilder" status="todo" />
              <FaseStep label="Fase 5 · Varsling + Deployment" status="todo" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FaseStep({
  label,
  status,
}: {
  label: string;
  status: "done" | "next" | "todo";
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={
          status === "done"
            ? "size-1.5 rounded-full bg-status-ok"
            : status === "next"
            ? "size-1.5 rounded-full bg-accent ring-4 ring-accent/20"
            : "size-1.5 rounded-full bg-status-idle"
        }
      />
      <span
        className={
          status === "done"
            ? "text-fg-muted line-through"
            : status === "next"
            ? "text-fg font-medium"
            : "text-fg-subtle"
        }
      >
        {label}
      </span>
    </div>
  );
}
