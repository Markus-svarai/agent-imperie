import Link from "next/link";
import { Badge, StatusDot } from "@/components/ui/badge";
import { cn, formatRelative } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import type { DepartmentId } from "@/lib/departments";
import { DEPARTMENT_MAP } from "@/lib/departments";

export interface AgentCardData {
  id: string;
  name: string;
  department: DepartmentId;
  role: string;
  model: "opus" | "sonnet" | "haiku";
  status: "active" | "idle" | "error" | "paused";
  description: string;
  lastRunAt?: Date | null;
  runsToday?: number;
  schedule?: string;
}

const ROLE_LABELS: Record<string, string> = {
  // Command
  orchestrator: "Operasjonssjef",
  strategist: "Strateg",
  intelligence: "Etterretning",
  coordinator: "Koordinator",
  // Engineering
  engineer: "Ingeniør",
  reviewer: "Reviewer",
  qa: "QA",
  devops: "DevOps",
  developer: "Utvikler",
  // Sales
  researcher: "Researcher",
  outreach: "Outreach",
  closer: "Closer",
  crm: "CRM",
  revenue: "Revenue",
  // Marketing
  content: "Innhold",
  seo: "SEO",
  brand: "Brand",
  social: "Sosiale medier",
  // Analytics
  analyst: "Analytiker",
  data: "Data",
  market: "Marked",
  synthesizer: "Syntese",
  // Operations
  guardian: "Vaktmester",
  security: "Sikkerhet",
  change: "Endring",
  scheduler: "Planlegger",
  // Finance
  reporter: "Rapportør",
  cost: "Kostnader",
  growth: "Vekst",
  // Research
  product: "Produkt",
  technical: "Teknologi",
  knowledge: "Kunnskap",
  custom: "Egendefinert",
};

export function AgentCard({ agent }: { agent: AgentCardData }) {
  const dept = DEPARTMENT_MAP[agent.department];

  return (
    <Link
      href={`/agents/${agent.id}`}
      className={cn(
        "group surface p-5 hover:border-border-strong transition-all",
        "hover:bg-bg-elevated"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <StatusDot status={agent.status} />
          <div className="text-base font-semibold tracking-tight">
            {agent.name}
          </div>
        </div>
        <Badge variant={agent.model === "opus" ? "accent" : "neutral"}>
          {agent.model}
        </Badge>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className={cn("text-xs uppercase tracking-wider font-medium", dept?.textColor)}>
          {ROLE_LABELS[agent.role] ?? agent.role}
        </span>
        <span className="text-fg-subtle text-xs">·</span>
        <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", dept?.bgColor, dept?.textColor)}>
          {dept?.shortName ?? agent.department.toUpperCase()}
        </span>
      </div>

      <p className="text-sm text-fg-muted leading-relaxed line-clamp-2 mb-4">
        {agent.description}
      </p>

      <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
        <div className="flex items-center gap-4 text-xs text-fg-subtle">
          <span>Sist: {formatRelative(agent.lastRunAt)}</span>
          {typeof agent.runsToday === "number" && (
            <span>{agent.runsToday} i dag</span>
          )}
        </div>
        <ArrowRight className="size-4 text-fg-subtle group-hover:text-accent transition-colors" />
      </div>
    </Link>
  );
}
