import { notFound } from "next/navigation";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MOCK_AGENTS } from "@/lib/mock-data";
import { DEPARTMENT_MAP } from "@/lib/departments";
import { Play, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = MOCK_AGENTS.find((a) => a.id === id);
  if (!agent) notFound();
  const dept = DEPARTMENT_MAP[agent.department];

  return (
    <div className="px-8 py-7 max-w-[1200px] mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded font-semibold uppercase tracking-wider",
                dept?.bgColor,
                dept?.textColor
              )}
            >
              {dept?.name ?? agent.department}
            </span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <StatusDot status={agent.status} />
            <h1 className="text-2xl font-semibold tracking-tight">
              {agent.name}
            </h1>
            <Badge variant={agent.model === "opus" ? "accent" : "neutral"}>
              {agent.model}
            </Badge>
          </div>
          <p className="text-sm text-fg-muted max-w-xl">{agent.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">
            <Settings2 className="size-3.5" />
            Konfigurer
          </Button>
          <Button variant="primary" size="sm">
            <Play className="size-3.5" />
            Kjør nå
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="text-xs text-fg-muted uppercase tracking-wider mb-2">
            Schedule
          </div>
          <div className="font-mono text-sm">
            {agent.schedule ?? "event-driven"}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-fg-muted uppercase tracking-wider mb-2">
            Status
          </div>
          <div className="text-sm font-medium capitalize">{agent.status}</div>
        </Card>
        <Card>
          <div className="text-xs text-fg-muted uppercase tracking-wider mb-2">
            Kjøringer i dag
          </div>
          <div className="text-sm font-medium">{agent.runsToday ?? 0}</div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Kjøringshistorikk"
          description="De siste 50 kjøringene for denne agenten"
        />
        <div className="py-12 text-center text-sm text-fg-muted">
          Ingen kjøringer ennå. Aktiver runtime i Fase 2 for å begynne.
        </div>
      </Card>
    </div>
  );
}
