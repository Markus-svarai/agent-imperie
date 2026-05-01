# Agent Imperie

Et autonomt operasjonssenter for AI-agenter. Flere spesialiserte agenter jobber sammen — Jarvis koordinerer, og du følger med fra commander dashboard.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind**
- **Postgres** via Supabase
- **Drizzle ORM** for typesikre queries og migrasjoner
- **Inngest** for agent-runtime, scheduling og durable execution
- **Anthropic SDK** med modell-router (Opus for Jarvis, Sonnet for resten)

## Agenter

| Agent    | Modell  | Rolle |
|----------|---------|-------|
| Jarvis   | Opus    | Operasjonssjef, koordinerer de andre |
| Guardian | Sonnet  | Overvåker systemer, varsler ved feil |
| Nova     | Sonnet  | Finner og kvalifiserer prospekter |
| Hermes   | Sonnet  | Personlig outreach basert på Nova |
| Dev      | Sonnet  | Leser logger, foreslår fixes |
| Scribe   | Sonnet  | Analyserer samtaler, finner mønstre |
| Ledger   | Sonnet  | Rapporterer aktivitet og nøkkeltall |

## Kom i gang

```bash
cp .env.example .env.local
# fyll inn nøkler

npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Åpne [localhost:3000](http://localhost:3000).

## Arkitektur

```
src/
├── app/                  Dashboard (Next.js App Router)
│   ├── (dashboard)/      Beskyttede sider
│   └── api/              API-endepunkter + Inngest webhook
├── components/           UI-komponenter
├── lib/
│   ├── db/               Drizzle-skjema og klient
│   ├── anthropic/        Claude-klient med modell-router
│   ├── agents/           BaseAgent + alle agent-implementasjoner
│   └── auth/             Supabase auth
└── types/                Delte TypeScript-typer
```

## Faser

- **Fase 1** (nå) — Fundament: skjema, dashboard-skjelett, agent-abstraksjon
- **Fase 2** — Runtime: Inngest koblet, BaseAgent kjørende
- **Fase 3** — Ledger (første ekte agent)
- **Fase 4** — Guardian + event-system
- **Fase 5** — Jarvis + inter-agent kommunikasjon
- **Fase 6** — Nova, Hermes, Dev, Scribe
