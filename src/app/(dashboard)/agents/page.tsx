import {
  Crown,
  Code2,
  TrendingUp,
  Megaphone,
  BarChart3,
  Shield,
  DollarSign,
  FlaskConical,
  Activity,
} from "lucide-react";
import { AgentCard } from "@/components/agent-card";
import { AGENTS_BY_DEPARTMENT, MOCK_AGENTS } from "@/lib/mock-data";
import { DEPARTMENTS } from "@/lib/departments";
import { cn } from "@/lib/utils";

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

export default function AgentsPage() {
  return (
    <div className="px-8 py-7 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-xs text-fg-muted uppercase tracking-wider mb-1.5">
            Imperiet
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Flåten</h1>
          <p className="text-sm text-fg-muted mt-1">
            {MOCK_AGENTS.length} agenter · 8 avdelinger · 0 aktive nå
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-fg-subtle">
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-status-ok" />
            Aktiv
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-status-idle" />
            Idle
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-status-error" />
            Feil
          </div>
        </div>
      </div>

      {/* Departments */}
      <div className="space-y-10">
        {DEPARTMENTS.map((dept) => {
          const agents = AGENTS_BY_DEPARTMENT[dept.id] ?? [];
          if (agents.length === 0) return null;
          const Icon = DEPT_ICONS[dept.id] ?? Activity;

          return (
            <section key={dept.id}>
              {/* Department header */}
              <div className="flex items-center gap-3 mb-5">
                <div
                  className={cn(
                    "size-8 rounded-lg flex items-center justify-center border",
                    dept.bgColor,
                    dept.borderColor
                  )}
                >
                  <Icon className={cn("size-4", dept.textColor)} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold tracking-tight">
                      {dept.name}
                    </h2>
                    <span
                      className={cn(
                        "text-xs px-1.5 py-0.5 rounded font-medium",
                        dept.bgColor,
                        dept.textColor
                      )}
                    >
                      {agents.length} agenter
                    </span>
                  </div>
                  <p className="text-xs text-fg-muted mt-0.5">
                    {dept.description}
                  </p>
                </div>
              </div>

              {/* Agent grid */}
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                {agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
