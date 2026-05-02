"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { FileText, BarChart2, Mail, AlertCircle, List } from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";

interface Artifact {
  id: string;
  type: string;
  title: string;
  content: string | null;
  createdAt: string;
  agentName: string | null;
  agentDepartment: string | null;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  report: BarChart2,
  summary: BarChart2,
  prospect_list: List,
  outreach_message: Mail,
  alert: AlertCircle,
  code_diff: FileText,
  other: FileText,
};

const TYPE_LABELS: Record<string, string> = {
  report: "Rapport",
  summary: "Sammendrag",
  prospect_list: "Prospektliste",
  outreach_message: "Outreach",
  alert: "Varsel",
  code_diff: "Kodeendring",
  other: "Annet",
};

const DEPT_COLORS: Record<string, string> = {
  command: "text-purple-400",
  sales: "text-emerald-400",
  marketing: "text-pink-400",
  engineering: "text-blue-400",
  analytics: "text-amber-400",
  operations: "text-orange-400",
  finance: "text-green-400",
  research: "text-cyan-400",
};

const FILTERS = ["Alle", "report", "summary", "prospect_list", "outreach_message", "alert", "code_diff"];

export default function ArtifactsPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Alle");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const params = filter !== "Alle" ? `?type=${filter}` : "";
    setLoading(true);
    fetch(`/api/artifacts${params}`)
      .then((r) => r.json())
      .then((d) => { setArtifacts(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter]);

  return (
    <div className="px-8 py-7 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <div className="text-xs text-fg-muted uppercase tracking-wider mb-1.5">Output</div>
        <h1 className="text-2xl font-semibold tracking-tight">Resultater</h1>
        <p className="text-sm text-fg-muted mt-1">
          Rapporter, analyser og innhold produsert av agentene.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
              filter === f
                ? "bg-accent/20 text-accent border-accent/30"
                : "bg-bg-elevated text-fg-muted border-border hover:text-fg"
            )}
          >
            {f === "Alle" ? "Alle" : (TYPE_LABELS[f] ?? f)}
          </button>
        ))}
      </div>

      {loading && (
        <div className="py-20 text-center text-sm text-fg-muted">Laster resultater…</div>
      )}

      {!loading && artifacts.length === 0 && (
        <Card>
          <div className="py-16 text-center">
            <div className="size-12 mx-auto rounded-full bg-bg-elevated border border-border flex items-center justify-center mb-4">
              <FileText className="size-5 text-fg-subtle" />
            </div>
            <div className="text-sm font-medium">Ingen resultater ennå</div>
            <div className="text-xs text-fg-muted mt-1.5 max-w-sm mx-auto">
              Når agentene starter kjøringene sine, dukker rapporter og analyser opp her.
            </div>
          </div>
        </Card>
      )}

      {!loading && artifacts.length > 0 && (
        <div className="space-y-2">
          {artifacts.map((a) => {
            const Icon = TYPE_ICONS[a.type] ?? FileText;
            const isOpen = expanded === a.id;
            return (
              <div key={a.id} className="surface rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : a.id)}
                  className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-bg-elevated transition-colors"
                >
                  <div className="size-8 rounded-lg bg-bg-elevated border border-border flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="size-4 text-fg-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={cn("text-xs font-medium", DEPT_COLORS[a.agentDepartment ?? ""] ?? "text-fg-muted")}>
                        {a.agentName ?? "Ukjent"}
                      </span>
                      <span className="text-xs text-fg-subtle">·</span>
                      <span className="text-xs text-fg-subtle">{TYPE_LABELS[a.type] ?? a.type}</span>
                    </div>
                    <div className="text-sm font-medium line-clamp-1">{a.title}</div>
                    {!isOpen && a.content && (
                      <div className="text-xs text-fg-muted mt-0.5 line-clamp-2">{a.content}</div>
                    )}
                  </div>
                  <div className="text-xs text-fg-subtle whitespace-nowrap shrink-0">
                    {formatRelative(new Date(a.createdAt))}
                  </div>
                </button>
                {isOpen && a.content && (
                  <div className="px-5 pb-5 border-t border-border-subtle">
                    <pre className="text-xs text-fg-muted mt-4 whitespace-pre-wrap leading-relaxed font-sans">
                      {a.content}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
