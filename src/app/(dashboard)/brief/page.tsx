"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Mail, MailOpen, PhoneCall, XCircle, Clock, RefreshCw,
  Loader2, CalendarPlus, ChevronDown, ChevronUp, AlertCircle,
  CheckCircle2, ArrowRight, MessageSquare,
} from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────

interface OutboundEmail {
  id: string;
  subject: string;
  body: string | null;
  toEmail: string | null;
  sentAt: string | null;
  createdAt: string;
  companyName: string | null;
  contactName: string | null;
  specialty: string | null;
  location: string | null;
  leadStatus: string | null;
}

interface InboundEmail {
  id: string;
  subject: string;
  fromEmail: string | null;
  body: string;
  sentAt: string | null;
  createdAt: string;
  companyName: string | null;
  contactName: string | null;
  specialty: string | null;
  location: string | null;
  leadStatus: string | null;
  fitScore: number | null;
}

interface Lead {
  companyName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  location: string | null;
  status: string;
  fitScore: number | null;
  notes: string | null;
  updatedAt: string | null;
  lastContactedAt?: string | null;
}

interface BriefData {
  generatedAt: string;
  days: number;
  outboundTotal: number;
  outboundByDaySerialized: Record<string, OutboundEmail[]>;
  inbound: InboundEmail[];
  wantCall: Lead[];
  notInterested: Lead[];
  noReply: Lead[];
  contacted: Lead[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function addToCalendar(lead: Lead) {
  const title = encodeURIComponent(`SvarAI demo — ${lead.companyName ?? "klinikk"}`);
  const details = encodeURIComponent(
    `Oppfølgingssamtale med ${lead.contactName ?? lead.companyName}.\n` +
    `${lead.specialty ?? ""} · ${lead.location ?? ""}\n` +
    `${lead.email ?? ""} · ${lead.phone ?? ""}`
  );
  // Default to tomorrow 10:00 for 30 minutes
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const end = new Date(tomorrow.getTime() + 30 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${fmt(tomorrow)}/${fmt(end)}`;
  window.open(url, "_blank");
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    interested:     { label: "Interessert",   cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25" },
    demo_booked:    { label: "Demo booket",   cls: "bg-status-ok/15 text-status-ok border-status-ok/25" },
    replied:        { label: "Svart",         cls: "bg-accent/15 text-accent border-accent/25" },
    contacted:      { label: "Kontaktet",     cls: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
    not_interested: { label: "Ikke interessert", cls: "bg-status-err/15 text-status-err border-status-err/25" },
    no_reply:       { label: "Ingen svar",    cls: "bg-bg-elevated text-fg-subtle border-border" },
    new:            { label: "Ny",            cls: "bg-fg-subtle/10 text-fg-subtle border-border" },
  };
  const s = map[status] ?? { label: status, cls: "bg-bg-elevated text-fg-subtle border-border" };
  return (
    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", s.cls)}>
      {s.label}
    </span>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  count,
  color = "text-fg-muted",
  urgent = false,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  color?: string;
  urgent?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-5 py-3.5 border-b border-border",
      urgent && count > 0 ? "bg-accent/5" : "bg-bg-surface"
    )}>
      <Icon className={cn("size-4", color)} />
      <span className="text-sm font-semibold tracking-tight">{title}</span>
      <span className={cn(
        "ml-auto text-xs font-medium px-2 py-0.5 rounded-full",
        urgent && count > 0
          ? "bg-accent/20 text-accent"
          : "bg-bg-elevated text-fg-subtle"
      )}>
        {count}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BriefPage() {
  const [data, setData] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState(30);
  const [expandedReply, setExpandedReply] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  const fetch_ = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const headers: Record<string, string> = {};
      const secret = process.env.NEXT_PUBLIC_DASHBOARD_SECRET;
      if (secret) headers["Authorization"] = `Bearer ${secret}`;
      const res = await fetch(`/api/brief?days=${days}`, { headers });
      if (res.ok) setData(await res.json() as BriefData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => { void fetch_(); }, [fetch_]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-fg-muted">
        <Loader2 className="size-4 animate-spin" /> Laster brief…
      </div>
    );
  }

  const sortedDays = Object.keys(data?.outboundByDaySerialized ?? {}).sort().reverse();
  const totalContacted = data?.contacted?.length ?? 0;
  const totalSentEmails = data?.outboundTotal ?? 0;

  return (
    <div className="px-8 py-7 max-w-[1100px] mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs text-fg-muted uppercase tracking-wider mb-1.5">Agentrapport</div>
          <h1 className="text-2xl font-semibold tracking-tight">Daglig brief</h1>
          <p className="text-sm text-fg-muted mt-1">
            Hva agentene har gjort, hvem som har svart, og hva som skjer videre.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-xs bg-bg-elevated border border-border rounded-lg px-3 py-2 text-fg-muted focus:outline-none focus:border-accent"
          >
            <option value={7}>Siste 7 dager</option>
            <option value={14}>Siste 14 dager</option>
            <option value={30}>Siste 30 dager</option>
          </select>
          <button
            onClick={() => void fetch_(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs text-fg-muted hover:text-fg hover:bg-bg-elevated transition-colors"
          >
            <RefreshCw className={cn("size-3", refreshing && "animate-spin")} />
            Oppdater
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "E-poster sendt", value: totalSentEmails, icon: Mail, color: "text-blue-400" },
          { label: "Svar mottatt", value: data?.inbound?.length ?? 0, icon: MailOpen, color: "text-accent" },
          { label: "Vil ha samtale", value: (data?.wantCall?.length ?? 0), icon: PhoneCall, color: "text-yellow-400", urgent: true },
          { label: "Ikke interessert", value: data?.notInterested?.length ?? 0, icon: XCircle, color: "text-status-err" },
        ].map((s) => (
          <div key={s.label} className={cn(
            "surface p-4",
            s.urgent && (s.value as number) > 0 && "border-yellow-500/30 bg-yellow-500/3"
          )}>
            <s.icon className={cn("size-4 mb-2", s.color)} />
            <div className={cn(
              "text-2xl font-semibold tabular-nums",
              (s.value as number) === 0 ? "text-fg-subtle" :
              s.urgent ? "text-yellow-400" : "text-fg"
            )}>
              {s.value}
            </div>
            <div className="text-xs text-fg-subtle mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Seksjon 1: Vil ha samtale ────────────────────────────────────── */}
      {(data?.wantCall?.length ?? 0) > 0 && (
        <div className="surface overflow-hidden">
          <SectionHeader
            icon={PhoneCall}
            title="🔥 Vil ha en samtale — book dem nå"
            count={data!.wantCall.length}
            color="text-yellow-400"
            urgent
          />
          <div className="divide-y divide-border-subtle">
            {data!.wantCall.map((lead, i) => (
              <div key={i} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold">{lead.companyName}</span>
                    <StatusBadge status={lead.status} />
                    {lead.fitScore && (
                      <span className="text-xs text-fg-subtle">Fit: {lead.fitScore}/10</span>
                    )}
                  </div>
                  <div className="text-xs text-fg-muted">
                    {[lead.contactName, lead.specialty, lead.location].filter(Boolean).join(" · ")}
                  </div>
                  {(lead.email || lead.phone) && (
                    <div className="flex items-center gap-3 mt-1.5">
                      {lead.phone && (
                        <a
                          href={`tel:${lead.phone.replace(/\s/g, "")}`}
                          className="flex items-center gap-1.5 text-sm font-semibold text-yellow-400 hover:text-yellow-300 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <PhoneCall className="size-3.5" />
                          {lead.phone}
                        </a>
                      )}
                      {lead.email && (
                        <span className="text-xs text-fg-subtle">✉ {lead.email}</span>
                      )}
                    </div>
                  )}
                  {lead.notes && (
                    <p className="text-xs text-fg-subtle mt-1.5 line-clamp-2 leading-relaxed italic">
                      {lead.notes.slice(0, 140)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => addToCalendar(lead)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent/10 border border-accent/25 text-accent text-xs font-medium hover:bg-accent/20 transition-colors shrink-0 whitespace-nowrap"
                >
                  <CalendarPlus className="size-3.5" />
                  Legg i kalender
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Seksjon 2: Svar mottatt ──────────────────────────────────────── */}
      <div className="surface overflow-hidden">
        <SectionHeader
          icon={MailOpen}
          title="Svar mottatt fra klinikker"
          count={data?.inbound?.length ?? 0}
          color="text-accent"
        />
        {(data?.inbound?.length ?? 0) === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-fg-muted">
            Ingen svar mottatt ennå. Hermes har sendt {totalSentEmails} e-poster.
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {data!.inbound.map((email) => {
              const isOpen = expandedReply === email.id;
              return (
                <div key={email.id} className="overflow-hidden">
                  <button
                    onClick={() => setExpandedReply(isOpen ? null : email.id)}
                    className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-bg-elevated transition-colors group"
                  >
                    <div className="size-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold text-accent">
                      {(email.companyName ?? "?")[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold">{email.companyName}</span>
                        {email.leadStatus && <StatusBadge status={email.leadStatus} />}
                      </div>
                      <div className="text-xs text-fg-muted">
                        {email.subject || "(ingen emne)"} · {formatRelative(new Date(email.sentAt ?? email.createdAt))}
                      </div>
                      {!isOpen && email.body && (
                        <p className="text-xs text-fg-subtle mt-1 line-clamp-1 leading-relaxed">
                          {email.body.slice(0, 120)}
                        </p>
                      )}
                    </div>
                    {isOpen
                      ? <ChevronUp className="size-4 text-fg-subtle shrink-0 mt-1" />
                      : <ChevronDown className="size-4 text-fg-subtle shrink-0 mt-1" />
                    }
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-border-subtle bg-bg-base/40">
                      <div className="flex items-center gap-3 mt-3 mb-3">
                        <span className="text-xs text-fg-subtle">
                          Fra: {email.fromEmail ?? "ukjent"}
                        </span>
                        <span className="text-xs text-fg-subtle">·</span>
                        <span className="text-xs text-fg-subtle">
                          {email.specialty} · {email.location}
                        </span>
                        {email.fitScore && (
                          <>
                            <span className="text-xs text-fg-subtle">·</span>
                            <span className="text-xs text-fg-subtle">Fit: {email.fitScore}/10</span>
                          </>
                        )}
                      </div>
                      <div className="bg-bg-elevated rounded-lg p-4 text-sm text-fg leading-relaxed whitespace-pre-wrap border border-border-subtle">
                        {email.body}
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <Link
                          href={"/command" as "/dashboard"}
                          className="flex items-center gap-1.5 text-xs text-accent hover:underline"
                        >
                          <MessageSquare className="size-3" />
                          Svar via Titan i Kommando
                        </Link>
                        {(email.leadStatus === "interested" || email.leadStatus === "demo_booked") && (
                          <button
                            onClick={() => addToCalendar({
                              companyName: email.companyName,
                              contactName: email.contactName,
                              email: email.fromEmail,
                              phone: null,
                              specialty: email.specialty,
                              location: email.location,
                              status: email.leadStatus!,
                              fitScore: email.fitScore,
                              notes: null,
                              updatedAt: null,
                            })}
                            className="flex items-center gap-1 text-xs text-yellow-400 hover:underline"
                          >
                            <CalendarPlus className="size-3" />
                            Book samtale
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Seksjon 3: Hermes sin utsendte e-post (gruppert per dag) ─────── */}
      <div className="surface overflow-hidden">
        <SectionHeader
          icon={Mail}
          title="Hermes har sendt e-post til"
          count={totalSentEmails}
          color="text-blue-400"
        />
        {sortedDays.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-fg-muted">
            Ingen e-poster sendt ennå i denne perioden.
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {sortedDays.map((day) => {
              const emails = data!.outboundByDaySerialized[day]!;
              const isOpen = expandedDay === day;
              const dateLabel = new Date(day).toLocaleDateString("nb-NO", {
                weekday: "long", day: "numeric", month: "long"
              });
              return (
                <div key={day}>
                  <button
                    onClick={() => setExpandedDay(isOpen ? null : day)}
                    className="w-full text-left px-5 py-3.5 flex items-center gap-3 hover:bg-bg-elevated transition-colors"
                  >
                    <div className="size-2 rounded-full bg-blue-400 shrink-0" />
                    <span className="text-sm font-medium capitalize">{dateLabel}</span>
                    <span className="text-xs text-fg-subtle ml-1">— sendte til {emails.length} klinikk{emails.length !== 1 ? "er" : ""}</span>
                    <span className="ml-auto">
                      {isOpen
                        ? <ChevronUp className="size-4 text-fg-subtle" />
                        : <ChevronDown className="size-4 text-fg-subtle" />
                      }
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-border-subtle divide-y divide-border-subtle">
                      {emails.map((e) => {
                        const emailOpen = expandedEmail === e.id;
                        return (
                          <div key={e.id}>
                            <button
                              onClick={() => setExpandedEmail(emailOpen ? null : e.id)}
                              className="w-full text-left flex items-center gap-4 px-6 py-3 text-xs hover:bg-bg-elevated transition-colors group"
                            >
                              <CheckCircle2 className="size-3.5 text-status-ok shrink-0" />
                              <span className="font-medium w-48 truncate">{e.companyName ?? "—"}</span>
                              <span className="text-fg-subtle w-24 truncate">{e.specialty ?? "—"}</span>
                              <span className="text-fg-subtle w-20 truncate">{e.location ?? "—"}</span>
                              <span className="text-fg-subtle truncate flex-1">{e.subject?.slice(0, 60) ?? "—"}</span>
                              {e.leadStatus && <StatusBadge status={e.leadStatus} />}
                              <span className="ml-2 shrink-0">
                                {emailOpen
                                  ? <ChevronUp className="size-3.5 text-fg-subtle" />
                                  : <ChevronDown className="size-3.5 text-fg-subtle opacity-0 group-hover:opacity-100 transition-opacity" />
                                }
                              </span>
                            </button>
                            {emailOpen && (
                              <div className="px-6 pb-4 border-t border-border-subtle bg-bg-base/50">
                                <div className="flex items-center gap-3 mt-3 mb-2 text-xs text-fg-subtle">
                                  <span>Til: <span className="text-fg">{e.toEmail ?? "—"}</span></span>
                                  {e.contactName && (
                                    <>
                                      <span>·</span>
                                      <span>{e.contactName}</span>
                                    </>
                                  )}
                                  <span>·</span>
                                  <span>{formatRelative(new Date(e.sentAt ?? e.createdAt))}</span>
                                </div>
                                <div className="text-xs font-medium text-fg mb-2">
                                  Emne: {e.subject ?? "(ingen emne)"}
                                </div>
                                {e.body ? (
                                  <div className="bg-bg-elevated rounded-lg p-4 text-xs text-fg leading-relaxed whitespace-pre-wrap border border-border-subtle max-h-72 overflow-y-auto">
                                    {e.body}
                                  </div>
                                ) : (
                                  <p className="text-xs text-fg-subtle italic">Ingen e-posttekst lagret.</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Seksjon 4: Kontaktet — venter på svar ───────────────────────── */}
      {totalContacted > 0 && (
        <div className="surface overflow-hidden">
          <SectionHeader
            icon={Clock}
            title="Kontaktet — venter på svar"
            count={totalContacted}
            color="text-blue-400"
          />
          <div className="divide-y divide-border-subtle">
            {data!.contacted.map((lead, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{lead.companyName}</span>
                    <span className="text-xs text-fg-subtle">
                      {[lead.specialty, lead.location].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  {lead.notes && (
                    <p className="text-xs text-fg-subtle mt-0.5 line-clamp-1 italic">{lead.notes.slice(0, 100)}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {lead.lastContactedAt && (
                    <span className="text-xs text-fg-subtle">
                      {formatRelative(new Date(lead.lastContactedAt))}
                    </span>
                  )}
                  {lead.fitScore && (
                    <span className="text-xs text-fg-subtle">Fit: {lead.fitScore}/10</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Seksjon 5: Ikke interessert ──────────────────────────────────── */}
      {(data?.notInterested?.length ?? 0) > 0 && (
        <div className="surface overflow-hidden">
          <SectionHeader
            icon={XCircle}
            title="Ikke interessert"
            count={data!.notInterested.length}
            color="text-status-err"
          />
          <div className="divide-y divide-border-subtle">
            {data!.notInterested.map((lead, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-fg-muted line-through">{lead.companyName}</span>
                    <span className="text-xs text-fg-subtle">
                      {[lead.specialty, lead.location].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  {lead.notes && (
                    <p className="text-xs text-fg-subtle mt-0.5 line-clamp-1 italic">{lead.notes.slice(0, 120)}</p>
                  )}
                </div>
                {lead.fitScore && (
                  <span className="text-xs text-fg-subtle shrink-0">Fit: {lead.fitScore}/10</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Seksjon 6: Ingen svar / skeptiske ───────────────────────────── */}
      {(data?.noReply?.length ?? 0) > 0 && (
        <div className="surface overflow-hidden">
          <SectionHeader
            icon={AlertCircle}
            title="Ingen svar — kan følges opp"
            count={data!.noReply.length}
            color="text-fg-muted"
          />
          <div className="divide-y divide-border-subtle">
            {data!.noReply.map((lead, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{lead.companyName}</span>
                    <span className="text-xs text-fg-subtle">
                      {[lead.specialty, lead.location].filter(Boolean).join(" · ")}
                    </span>
                    {lead.fitScore && lead.fitScore >= 8 && (
                      <span className="text-xs text-yellow-400 font-medium">Høy fit — prøv igjen</span>
                    )}
                  </div>
                  {lead.notes && (
                    <p className="text-xs text-fg-subtle mt-0.5 line-clamp-1 italic">{lead.notes.slice(0, 120)}</p>
                  )}
                </div>
                <Link
                  href={"/command" as "/dashboard"}
                  className="flex items-center gap-1 text-xs text-accent hover:underline shrink-0"
                >
                  Følg opp <ArrowRight className="size-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
