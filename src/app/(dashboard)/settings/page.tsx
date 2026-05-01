import { Card, CardHeader } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="px-8 py-7 max-w-[900px] mx-auto">
      <div className="mb-8">
        <div className="text-xs text-fg-muted uppercase tracking-wider mb-1.5">
          Konfig
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Innstillinger</h1>
        <p className="text-sm text-fg-muted mt-1">
          Organisasjon, API-nøkler og runtime-innstillinger.
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader
            title="Organisasjon"
            description="Multi-tenant fra dag én — bytt eller legg til organisasjoner her senere"
          />
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-fg-muted text-xs uppercase tracking-wider mb-1">
                Navn
              </dt>
              <dd className="font-medium">Default</dd>
            </div>
            <div>
              <dt className="text-fg-muted text-xs uppercase tracking-wider mb-1">
                Slug
              </dt>
              <dd className="font-mono text-xs">default</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="API-nøkler"
            description="Konfigureres via miljøvariabler i .env.local"
          />
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between font-mono text-xs">
              <span className="text-fg-muted">DATABASE_URL</span>
              <span className="text-fg-subtle">.env.local</span>
            </li>
            <li className="flex items-center justify-between font-mono text-xs">
              <span className="text-fg-muted">ANTHROPIC_API_KEY</span>
              <span className="text-fg-subtle">.env.local</span>
            </li>
            <li className="flex items-center justify-between font-mono text-xs">
              <span className="text-fg-muted">INNGEST_SIGNING_KEY</span>
              <span className="text-fg-subtle">.env.local</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
