"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Power } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [systemEnabled, setSystemEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/system")
      .then((r) => r.json())
      .then((d: { systemEnabled: boolean }) => setSystemEnabled(d.systemEnabled))
      .catch(() => setSystemEnabled(true));
  }, []);

  async function toggleSystem() {
    if (systemEnabled === null) return;
    const next = !systemEnabled;
    setSaving(true);
    const res = await fetch("/api/system", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemEnabled: next }),
    });
    if (res.ok) setSystemEnabled(next);
    setSaving(false);
  }

  return (
    <div className="px-8 py-7 max-w-[900px] mx-auto">
      <div className="mb-8">
        <div className="text-xs text-fg-muted uppercase tracking-wider mb-1.5">Konfig</div>
        <h1 className="text-2xl font-semibold tracking-tight">Innstillinger</h1>
        <p className="text-sm text-fg-muted mt-1">
          Organisasjon, API-nøkler og runtime-innstillinger.
        </p>
      </div>

      <div className="space-y-4">

        {/* Kill switch */}
        <Card>
          <CardHeader
            title="Global kill switch"
            description="Stopper alle agent-kjøringer umiddelbart. Neste cron-runde hoppes over til du skrur det på igjen."
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "size-9 rounded-lg flex items-center justify-center border",
                systemEnabled === null
                  ? "bg-bg-elevated border-border text-fg-subtle"
                  : systemEnabled
                  ? "bg-green-500/10 border-green-500/20 text-green-400"
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              )}>
                <Power className="size-4" />
              </div>
              <div>
                <div className="text-sm font-medium">
                  {systemEnabled === null
                    ? "Laster…"
                    : systemEnabled
                    ? "Systemet er aktivt"
                    : "⚠ Systemet er stoppet"}
                </div>
                <div className="text-xs text-fg-muted">
                  {systemEnabled === null
                    ? ""
                    : systemEnabled
                    ? "Alle agenter kjører etter schedule"
                    : "Alle agent-kjøringer er satt på pause"}
                </div>
              </div>
            </div>

            {/* Toggle */}
            <button
              onClick={toggleSystem}
              disabled={saving || systemEnabled === null}
              aria-label="Toggle system"
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
                "transition-colors duration-200 focus:outline-none disabled:opacity-50",
                systemEnabled ? "bg-green-500" : "bg-red-500/50"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block size-5 rounded-full bg-white shadow",
                  "transform transition-transform duration-200",
                  systemEnabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </Card>

        {/* Org */}
        <Card>
          <CardHeader
            title="Organisasjon"
            description="Multi-tenant fra dag én — bytt eller legg til organisasjoner her senere"
          />
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-fg-muted text-xs uppercase tracking-wider mb-1">Navn</dt>
              <dd className="font-medium">Default</dd>
            </div>
            <div>
              <dt className="text-fg-muted text-xs uppercase tracking-wider mb-1">Slug</dt>
              <dd className="font-mono text-xs">default</dd>
            </div>
          </dl>
        </Card>

        {/* API keys */}
        <Card>
          <CardHeader
            title="Miljøvariabler"
            description="Konfigureres i .env.local og Vercel → Settings → Environment Variables"
          />
          <ul className="space-y-2 text-sm">
            {[
              ["DATABASE_URL", "Supabase connection string"],
              ["ANTHROPIC_API_KEY", "Claude API-tilgang"],
              ["INNGEST_SIGNING_KEY", "Inngest webhook-signering"],
              ["RESEND_API_KEY", "Utgående e-post (outreach)"],
              ["RESEND_WEBHOOK_SECRET", "Validerer innkommende Resend-webhooks"],
              ["TAVILY_API_KEY", "Søk / markedsintelligens"],
              ["SLACK_WEBHOOK_URL", "Varsler til Slack"],
              ["MARKUS_PHONE", "921 67 470 — brukes i Østfold-CTA"],
              ["CALENDLY_LINK", "Demo-booking URL"],
              ["DAILY_OUTREACH_LIMIT", "Maks e-poster per dag (default: 10)"],
              ["DIGEST_EMAIL", "Hvem mottar daglig digest"],
            ].map(([key, desc]) => (
              <li key={key} className="flex items-center justify-between text-xs">
                <span className="font-mono text-fg-muted">{key}</span>
                <span className="text-fg-subtle">{desc}</span>
              </li>
            ))}
          </ul>
        </Card>

      </div>
    </div>
  );
}
