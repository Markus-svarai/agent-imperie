"use client";

import { useEffect, useState, useCallback } from "react";
import { Phone, CheckCircle2, RefreshCw, Mail, MapPin, Clock, RotateCcw } from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";

interface RingLead {
  id: string;
  companyName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  specialty: string | null;
  location: string | null;
  outreachCount: number;
  lastContactedAt: string | null;
  calledAt: string | null;
  status: string;
}

interface RingerData {
  pending: RingLead[];   // 2 e-poster sendt, ikke ringt ennå
  called: RingLead[];    // allerede ringt
}

const STATUS_COLORS: Record<string, string> = {
  no_reply:  "bg-status-err/10 text-status-err",
  contacted: "bg-blue-500/10 text-blue-400",
  replied:   "bg-accent/10 text-accent",
  interested:"bg-yellow-500/10 text-yellow-400",
};

const STATUS_LABELS: Record<string, string> = {
  no_reply:  "Ingen svar",
  contacted: "Kontaktet",
  replied:   "Svarte",
  interested:"Interessert",
};

export default function RingerPage() {
  const [data, setData] = useState<RingerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads/ring-list");
      if (res.ok) setData(await res.json() as RingerData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  async function markCalled(id: string) {
    setCalling(id);
    await fetch(`/api/leads/${id}/mark-called`, { method: "POST" });
    await fetchData();
    setCalling(null);
  }

  async function unmarkCalled(id: string) {
    setCalling(id);
    await fetch(`/api/leads/${id}/mark-called`, { method: "DELETE" });
    await fetchData();
    setCalling(null);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw className="size-5 animate-spin text-fg-muted" />
      </div>
    );
  }

  const pending = data?.pending ?? [];
  const called  = data?.called  ?? [];

  return (
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs text-fg-muted uppercase tracking-wider mb-1">Manuell oppfølging</div>
          <h1 className="text-2xl font-semibold tracking-tight">Ring-liste</h1>
          <p className="text-sm text-fg-muted mt-1">
            Klinikker som har fått 2 e-poster uten svar — ring dem manuelt.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-fg-muted hover:text-fg hover:bg-bg-elevated transition-colors"
        >
          <RefreshCw className="size-3" /> Oppdater
        </button>
      </div>

      {/* Å ringe */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Phone className="size-4 text-accent" />
          <span className="text-sm font-semibold">Å ringe</span>
          {pending.length > 0 && (
            <span className="text-xs bg-accent/15 text-accent px-2 py-0.5 rounded-full font-medium">
              {pending.length}
            </span>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="surface p-8 text-center border-dashed">
            <Phone className="size-8 mx-auto text-fg-subtle mb-2" />
            <div className="text-sm font-medium text-fg-muted">Ingen klinikker å ringe nå</div>
            <div className="text-xs text-fg-subtle mt-1">
              Her dukker klinikker opp etter at Hermes har sendt 2 e-poster uten svar
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onCall={() => markCalled(lead.id)}
                loading={calling === lead.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Allerede ringt */}
      {called.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="size-4 text-status-ok" />
            <span className="text-sm font-semibold text-fg-muted">Ringt</span>
            <span className="text-xs bg-status-ok/10 text-status-ok px-2 py-0.5 rounded-full font-medium">
              {called.length}
            </span>
          </div>
          <div className="space-y-2">
            {called.map((lead) => (
              <div key={lead.id} className="surface p-4 flex items-center justify-between opacity-60">
                <div>
                  <div className="text-sm font-medium line-through">{lead.companyName}</div>
                  <div className="text-xs text-fg-subtle mt-0.5">
                    Ringt {lead.calledAt ? formatRelative(new Date(lead.calledAt)) : ""}
                  </div>
                </div>
                <button
                  onClick={() => unmarkCalled(lead.id)}
                  disabled={calling === lead.id}
                  className="flex items-center gap-1 text-xs text-fg-subtle hover:text-fg transition-colors"
                >
                  <RotateCcw className="size-3" /> Angre
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LeadCard({ lead, onCall, loading }: {
  lead: RingLead;
  onCall: () => void;
  loading: boolean;
}) {
  const statusColor = STATUS_COLORS[lead.status] ?? "bg-fg-subtle/10 text-fg-muted";
  const statusLabel = STATUS_LABELS[lead.status] ?? lead.status;

  return (
    <div className="surface p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold">{lead.companyName}</span>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor)}>
            {statusLabel}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-subtle">
          {lead.location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" /> {lead.location}
            </span>
          )}
          {lead.specialty && <span>{lead.specialty}</span>}
          {lead.email && (
            <span className="flex items-center gap-1">
              <Mail className="size-3" /> {lead.email}
            </span>
          )}
          {lead.lastContactedAt && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              Siste e-post {formatRelative(new Date(lead.lastContactedAt))}
            </span>
          )}
        </div>

        {lead.contactName && (
          <div className="text-xs text-fg-subtle mt-1">Kontakt: {lead.contactName}</div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {lead.phone ? (
          <a
            href={`tel:${lead.phone.replace(/\s/g, "")}`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <Phone className="size-3.5" />
            {lead.phone}
          </a>
        ) : (
          <span className="text-xs text-fg-subtle px-3 py-2">Intet telefonnr.</span>
        )}
        <button
          onClick={onCall}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs text-fg-muted hover:text-status-ok hover:border-status-ok/50 transition-colors"
        >
          <CheckCircle2 className="size-3.5" />
          {loading ? "..." : "Ringt"}
        </button>
      </div>
    </div>
  );
}
