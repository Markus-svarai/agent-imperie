import { Card } from "@/components/ui/card";
import { Bell } from "lucide-react";

export default function EventsPage() {
  return (
    <div className="px-8 py-7 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <div className="text-xs text-fg-muted uppercase tracking-wider mb-1.5">
          Signaler
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Hendelser</h1>
        <p className="text-sm text-fg-muted mt-1">
          Inter-agent meldinger, systemvarsler og eksterne triggers.
        </p>
      </div>

      <Card>
        <div className="py-16 text-center">
          <div className="size-12 mx-auto rounded-full bg-bg-elevated border border-border flex items-center justify-center mb-4">
            <Bell className="size-5 text-fg-subtle" />
          </div>
          <div className="text-sm font-medium">Stille på linjen</div>
          <div className="text-xs text-fg-muted mt-1.5 max-w-sm mx-auto">
            Event-systemet aktiveres i Fase 4. Da begynner agentene å snakke
            sammen.
          </div>
        </div>
      </Card>
    </div>
  );
}
