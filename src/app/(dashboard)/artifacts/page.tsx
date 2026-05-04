"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import {
  FileText, BarChart2, Mail, AlertCircle, List,
  ChevronDown, Copy, Check, ExternalLink, Loader2,
} from "lucide-react";
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

const DEPT_BG: Record<string, string> = {
  command: "bg-purple-500/10 border-purple-500/20",
  sales: "bg-emerald-500/10 border-emerald-500/20",
  marketing: "bg-pink-500/10 border-pink-500/20",
  engineering: "bg-blue-500/10 border-blue-500/20",
  analytics: "bg-amber-500/10 border-amber-500/20",
  operations: "bg-orange-500/10 border-orange-500/20",
  finance: "bg-green-500/10 border-green-500/20",
  research: "bg-cyan-500/10 border-cyan-500/20",
};

const FILTERS = ["Alle", "report", "summary", "prospect_list", "outreach_message", "alert", "code_diff"];

/** Parse content: try JSON extraction, else return as-is */
function parseContent(raw: string | null): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Common patterns: { summary, content, body, text, report, analysis }
    const text = parsed.summary ?? parsed.content ?? parsed.body ?? parsed.text ?? parsed.report ?? parsed.analysis ?? parsed.output;
    if (typeof text === "string") return text;
    // If it's a plain object with no obvious text field, pretty-print it
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

/** Detect if content looks like code (JSON / diff / code block) */
function isCode(content: string): boolean {
  const trimmed = content.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.startsWith("diff ") || trimmed.startsWith("```");
}

function ArtifactContent({ content }: { content: string }) {
  const parsed = parseContent(content);
  const code = isCode(parsed);

  if (code) {
    return (
      <pre className="text-xs text-fg-muted bg-bg-base rounded-lg p-4 mt-4 whitespace-pre-wrap leading-relaxed font-mono overflow-x-auto border border-border-subtle">
        {parsed}
      </pre>
    );
  }

  // Render as readable paragraphs
  const sections = parsed.split(/\n{2,}/);
  return (
    <div className="mt-4 space-y-3">
      {sections.map((section, i) => {
        const trimmed = section.trim();
        if (!trimmed) return null;
        // Markdown headings
        if (/^#{1,3}\s/.test(trimmed)) {
          const text = trimmed.replace(/^#{1,3}\s/, "");
          return (
            <div key={i} className="text-xs font-semibold text-fg uppercase tracking-wider mt-5 first:mt-0">
              {text}
            </div>
          );
        }
        // Bullet lists
        if (/^[-*•]\s/.test(trimmed)) {
          const items = trimmed.split("\n").map((l) => l.replace(/^[-*•]\s/, "").trim()).filter(Boolean);
          return (
            <ul key={i} className="space-y-1 pl-1">
              {items.map((item, j) => (
                <li key={j} className="flex items-start gap-2 text-xs text-fg-muted leading-relaxed">
                  <span className="size-1 rounded-full bg-fg-subtle shrink-0 mt-1.5" />
                  {item}
                </li>
              ))}
            </ul>
          );
        }
        // Numbered lists
        if (/^\d+\.\s/.test(trimmed)) {
          const items = trimmed.split("\n").map((l) => l.replace(/^\d+\.\s/, "").trim()).filter(Boolean);
          return (
            <ol key={i} className="space-y-1 pl-1">
              {items.map((item, j) => (
                <li key={j} className="flex items-start gap-2 text-xs text-fg-muted leading-relaxed">
                  <span className="text-fg-subtle shrink-0 tabular-nums">{j + 1}.</span>
                  {item}
                </li>
              ))}
            </ol>
          );
        }
        // Normal paragraph
        return (
          <p key={i} className="text-xs text-fg-muted leading-relaxed">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); copy(); }}
      className="flex items-center gap-1 text-xs text-fg-subtle hover:text-fg transition-colors px-2 py-1 rounded-md hover:bg-bg-elevated"
    >
      {copied ? <Check className="size-3 text-status-ok" /> : <Copy className="size-3" />}
      {copied ? "Kopiert" : "Kopier"}
    </button>
  );
}

export default function ArtifactsPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Alle");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const params = filter !== "Alle" ? `?type=${filter}` : "";
    setLoading(true);
    const headers: Record<string, string> = {};
    const secret = process.env.NEXT_PUBLIC_DASHBOARD_SECRET;
    if (secret) headers["Authorization"] = `Bearer ${secret}`;
    fetch(`/api/artifacts${params}`, { headers })
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

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setExpanded(null); }}
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
        <div className="py-20 flex items-center justify-center gap-2 text-sm text-fg-muted">
          <Loader2 className="size-4 animate-spin" /> Laster resultater…
        </div>
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
            const dept = a.agentDepartment ?? "";
            const parsedContent = parseContent(a.content);

            return (
              <div
                key={a.id}
                className={cn(
                  "rounded-xl overflow-hidden border transition-all duration-200",
                  isOpen
                    ? "border-border-strong bg-bg-surface shadow-sm"
                    : "border-border bg-bg-surface hover:border-border-strong hover:bg-bg-elevated"
                )}
              >
                {/* Header row — always visible, always clickable */}
                <button
                  onClick={() => setExpanded(isOpen ? null : a.id)}
                  className="w-full text-left px-5 py-4 flex items-center gap-4 group"
                >
                  {/* Icon */}
                  <div className={cn(
                    "size-9 rounded-lg flex items-center justify-center shrink-0 border",
                    DEPT_BG[dept] ?? "bg-bg-elevated border-border"
                  )}>
                    <Icon className={cn("size-4", DEPT_COLORS[dept] ?? "text-fg-muted")} />
                  </div>

                  {/* Meta + title */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={cn("text-xs font-semibold", DEPT_COLORS[dept] ?? "text-fg-muted")}>
                        {a.agentName ?? "Ukjent"}
                      </span>
                      <span className="text-xs text-fg-subtle">·</span>
                      <span className="text-xs text-fg-subtle">{TYPE_LABELS[a.type] ?? a.type}</span>
                      <span className="text-xs text-fg-subtle">·</span>
                      <span className="text-xs text-fg-subtle">{formatRelative(new Date(a.createdAt))}</span>
                    </div>
                    <div className="text-sm font-semibold tracking-tight line-clamp-1">{a.title}</div>
                    {!isOpen && parsedContent && (
                      <div className="text-xs text-fg-muted mt-0.5 line-clamp-1 leading-relaxed">
                        {parsedContent.replace(/^#+\s*/gm, "").split("\n").find((l) => l.trim().length > 10) ?? ""}
                      </div>
                    )}
                  </div>

                  {/* Chevron */}
                  <ChevronDown className={cn(
                    "size-4 text-fg-subtle shrink-0 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )} />
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="border-t border-border-subtle">
                    {/* Actions bar */}
                    <div className="flex items-center justify-between px-5 py-2 bg-bg-base/50">
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full border",
                          DEPT_BG[dept] ?? "bg-bg-elevated border-border",
                          DEPT_COLORS[dept] ?? "text-fg-muted"
                        )}>
                          {TYPE_LABELS[a.type] ?? a.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {parsedContent && <CopyButton text={parsedContent} />}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const blob = new Blob([parsedContent], { type: "text/plain" });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = `${a.title.replace(/[^a-zA-Z0-9æøåÆØÅ\s]/g, "").trim().replace(/\s+/g, "_")}.txt`;
                            link.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="flex items-center gap-1 text-xs text-fg-subtle hover:text-fg transition-colors px-2 py-1 rounded-md hover:bg-bg-elevated"
                        >
                          <ExternalLink className="size-3" />
                          Last ned
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="px-5 pb-6">
                      {parsedContent
                        ? <ArtifactContent content={parsedContent} />
                        : <p className="text-xs text-fg-subtle mt-4 italic">Ingen innhold tilgjengelig.</p>
                      }
                    </div>
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
