import { Card } from "@/components/ui/card";
import { Activity } from "lucide-react";

export default function RunsPage() {
  return (
    <div className="px-8 py-7 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <div className="text-xs text-fg-muted uppercase tracking-wider mb-1.5">
          Aktivitet
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Kjøringer</h1>
        <p className="text-sm text-fg-muted mt-1">
          Hver agent-kjøring logges her med full sporbarhet — input, steps,
          output og kost.
        </p>
      </div>

      <Card>
        <div className="py-16 text-center">
          <div className="size-12 mx-auto rounded-full bg-bg-elevated border border-border flex items-center justify-center mb-4">
            <Activity className="size-5 text-fg-subtle" />
          </div>
          <div className="text-sm font-medium">Ingen kjøringer ennå</div>
          <div className="text-xs text-fg-muted mt-1.5 max-w-sm mx-auto">
            Når Fase 2 (Inngest-runtime) kobles på, vil hver kjøring dukke opp
            her med fullstendig trace.
          </div>
        </div>
      </Card>
    </div>
  );
}
