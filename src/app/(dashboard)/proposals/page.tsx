"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Crown, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";

interface Proposal {
  id: string;
  createdBy: string;
  title: string;
  summary: string;
  status: string;
  createdAt: string;
  proposals: Array<{
    area: string;
    problem: string;
    suggestion: string;
    priority: "high" | "medium" | "low";
  }>;
}

const PRIORITY_COLORS = {
  high: "text-red-400 bg-red-400/10 border-red-400/20",
  medium: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  low: "text-blue-400 bg-blue-400/10 border-blue-400/20",
};

const STATUS_CONFIG = {
  pending: { label: "Venter", icon: Clock, color: "text-amber-400" },
  reviewed: { label: "Lest", icon: Clock, color: "text-blue-400" },
  implemented: { label: "Implementert", icon: CheckCircle2, color: "text-green-400" },
  dismissed: { label: "Avvist", icon: XCircle, color: "text-fg-subtle" },
};

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/proposals")
      .then((r) => r.json())
      .then((data) => {
        setProposals(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    const res = await fetch(`/api/proposals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json() as Proposal;
      setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
    }
    setUpdating(null);
  }

  const pending = proposals.filter((p) => p.status === "pending");
  const rest = proposals.filter((p) => p.status !== "pending");

  return (
    <div className="px-8 py-7 max-w-[900px] mx-auto">
      <div className="mb-8">
        <div className="text-xs text-fg-muted uppercase tracking-wider mb-1.5">Command</div>
        <h1 className="text-2xl font-semibold tracking-tight">Athenas forslag</h1>
        <p className="text-sm text-fg-muted mt-1">
          Strategiske anbefalinger fra Athena. Godkjenn, avvis eller marker som implementert.
        </p>
      </div>

      {loading && (
        <div className="py-20 text-center text-sm text-fg-muted">Laster forslag…</div>
      )}

      {!loading && proposals.length === 0 && (
        <Card>
          <div className="py-16 text-center">
            <div className="size-12 mx-auto rounded-full bg-bg-elevated border border-border flex items-center justify-center mb-4">
              <Crown className="size-5 text-fg-subtle" />
            </div>
            <div className="text-sm font-medium">Ingen forslag ennå</div>
            <div className="text-xs text-fg-muted mt-1.5 max-w-sm mx-auto">
              Athena kjører mandag 08:00 og leverer strategiforslag her etter første analyse.
            </div>
          </div>
        </Card>
      )}

      {pending.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold">Venter på svar</h2>
            <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">
              {pending.length}
            </span>
          </div>
          <div className="space-y-3">
            {pending.map((p) => (
              <ProposalCard
                key={p.id}
                proposal={p}
                expanded={expanded === p.id}
                onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
                onUpdate={updateStatus}
                updating={updating === p.id}
              />
            ))}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-4 text-fg-muted">Tidligere forslag</h2>
          <div className="space-y-3">
            {rest.map((p) => (
              <ProposalCard
                key={p.id}
                proposal={p}
                expanded={expanded === p.id}
                onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
                onUpdate={updateStatus}
                updating={updating === p.id}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ProposalCard({
  proposal,
  expanded,
  onToggle,
  onUpdate,
  updating,
}: {
  proposal: Proposal;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (id: string, status: string) => void;
  updating: boolean;
}) {
  const statusCfg = STATUS_CONFIG[proposal.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;
  const isPending = proposal.status === "pending";

  return (
    <div className="surface rounded-xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-4 hover:bg-bg-elevated transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="size-3.5 text-accent shrink-0" />
            <span className="text-xs text-fg-muted">Athena · {new Date(proposal.createdAt).toLocaleDateString("nb-NO")}</span>
          </div>
          <div className="text-sm font-semibold line-clamp-1">{proposal.title}</div>
          {!expanded && (
            <div className="text-xs text-fg-muted mt-1 line-clamp-2">{proposal.summary}</div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className={cn("flex items-center gap-1.5 text-xs font-medium", statusCfg.color)}>
            <StatusIcon className="size-3.5" />
            {statusCfg.label}
          </div>
          {expanded ? (
            <ChevronUp className="size-4 text-fg-subtle" />
          ) : (
            <ChevronDown className="size-4 text-fg-subtle" />
          )}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-border-subtle">
          <p className="text-sm text-fg-muted mt-4 mb-5 leading-relaxed">{proposal.summary}</p>

          {proposal.proposals?.length > 0 && (
            <div className="space-y-3 mb-5">
              {proposal.proposals.map((item, i) => (
                <div key={i} className="bg-bg-elevated rounded-lg p-4 border border-border-subtle">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                      {item.area}
                    </div>
                    <span className={cn(
                      "text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0",
                      PRIORITY_COLORS[item.priority]
                    )}>
                      {item.priority === "high" ? "Høy" : item.priority === "medium" ? "Medium" : "Lav"}
                    </span>
                  </div>
                  <div className="text-xs text-red-400/80 mb-2">⚠ {item.problem}</div>
                  <div className="text-sm">💡 {item.suggestion}</div>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {isPending && (
              <>
                <button
                  disabled={updating}
                  onClick={() => onUpdate(proposal.id, "implemented")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="size-3.5" />
                  Implementer
                </button>
                <button
                  disabled={updating}
                  onClick={() => onUpdate(proposal.id, "reviewed")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-elevated border border-border text-fg-muted text-xs font-medium hover:text-fg transition-colors disabled:opacity-50"
                >
                  Marker som lest
                </button>
                <button
                  disabled={updating}
                  onClick={() => onUpdate(proposal.id, "dismissed")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  <XCircle className="size-3.5" />
                  Avvis
                </button>
              </>
            )}
            {!isPending && proposal.status !== "implemented" && (
              <button
                disabled={updating}
                onClick={() => onUpdate(proposal.id, "implemented")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-elevated border border-border text-fg-muted text-xs hover:text-fg transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="size-3.5" />
                Marker som implementert
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
