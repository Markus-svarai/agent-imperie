import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function ArtifactsPage() {
  return (
    <div className="px-8 py-7 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <div className="text-xs text-fg-muted uppercase tracking-wider mb-1.5">
          Output
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Resultater</h1>
        <p className="text-sm text-fg-muted mt-1">
          Alle artefakter agentene har produsert — rapporter, prospektlister,
          outreach-meldinger, varsler.
        </p>
      </div>

      <Card>
        <div className="py-16 text-center">
          <div className="size-12 mx-auto rounded-full bg-bg-elevated border border-border flex items-center justify-center mb-4">
            <FileText className="size-5 text-fg-subtle" />
          </div>
          <div className="text-sm font-medium">Ingen resultater ennå</div>
          <div className="text-xs text-fg-muted mt-1.5 max-w-sm mx-auto">
            Når Ledger leverer sin første rapport eller Nova sin første
            prospektliste, dukker de opp her.
          </div>
        </div>
      </Card>
    </div>
  );
}
