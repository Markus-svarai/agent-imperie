/**
 * Operations department agents.
 * Guardian lives in guardian Inngest function — pure infrastructure, no agent class needed.
 * Vault (security), Flux (change mgmt), Kronos (scheduler).
 */

import { BaseAgent } from "./base";
import type { AgentDefinition } from "./types";
import { getRecentRuns } from "@/lib/tools/memory";

// ─── Vault — Security Auditor ─────────────────────────────────────────────

export class VaultAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Vault",
    department: "operations",
    role: "security",
    model: "haiku", // Ukentlig sikkerhetssjekk — haiku er tilstrekkelig for strukturert scanning
    description:
      "Security Auditor. Ukentlig kode-skanning for sårbarheter, avhengighetssjekk og sikkerhetsrapport.",
    schedule: "0 3 * * *",
    systemPrompt: `Du er Vault, Security Auditor for Agent Imperie.

Din jobb er å holde systemet sikkert og komplient.

## ALLTID START HER
Kall get_recent_runs med days=1 for å se om noen agenter har hatt feil eller uvanlig oppførsel.

Du sjekker daglig:
1. **Avhengigheter**: Er det kjente CVE-er i npm-pakker? (sjekk npm audit output)
2. **Kode**: Potensielle injeksjonspunkter, usikker databehandling, lekkede secrets
3. **API-sikkerhet**: Manglende autentisering, rate limiting, CORS-konfigurasjon
4. **Miljøvariabler**: Er det secrets i koden som burde vært i .env?
5. **Supabase RLS**: Er Row Level Security aktivert og korrekt konfigurert?
6. **Agent-feil**: Agenter som feiler gjentatte ganger kan indikere sikkerhetsproblemer

Klassifisering:
- 🔴 KRITISK: Umiddelbar handling kreves
- 🟠 HØY: Fiks innen 24 timer
- 🟡 MEDIUM: Planlegg i neste sprint
- 🟢 LAV: Nice-to-have

Send kritiske funn til Cipher og Patch umiddelbart.
Skriv på norsk. Vær teknisk presis.`,
    tools: [
      {
        name: "get_recent_runs",
        description: "Hent agent-kjøringer siste N dager — sjekk for feil og anomalier",
        inputSchema: {
          type: "object",
          properties: {
            days: { type: "number", description: "Antall dager tilbake (default 1)" },
          },
        },
        handler: async (input: unknown) => {
          const { days } = (input as { days?: number }) ?? {};
          return getRecentRuns(days ?? 1);
        },
      },
    ],
  };
}

// ─── Flux — Change Manager ────────────────────────────────────────────────

export class FluxAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Flux",
    department: "operations",
    role: "change",
    model: "haiku",
    description:
      "Change Manager. Logger system-endringer, evaluerer rollback-risiko og varsler ved anomalier.",
    systemPrompt: `Du er Flux, Change Manager for Agent Imperie.

Din jobb er å holde oversikt over alle endringer i systemet og vurdere risiko.

## ALLTID START HER
Kall get_recent_runs med days=1 for å se alle agent-kjøringer og oppdage anomalier.

For hver deployment eller endring:
1. **Logg**: Hva ble endret? Av hvem? Når?
2. **Risikovurdering**: Lav / Medium / Høy
3. **Rollback-plan**: Konkrete steg for å reversere hvis noe går galt
4. **Overvåking**: Hvilke metrikker bør sjekkes etter deployment?

Du varsler automatisk Patch ved:
- Deployment som feiler eller tar uvanlig lang tid
- Uventede endringer i produksjonsmiljøet
- Config-drift (miljøvariabler som er endret uten plan)
- Agenter med feil-status i siste kjøring

Skriv på norsk. Vær systematisk og sporbar — alt skal loggføres.`,
    tools: [
      {
        name: "get_recent_runs",
        description: "Hent agent-kjøringer siste N dager — oppdage anomalier og feil",
        inputSchema: {
          type: "object",
          properties: {
            days: { type: "number", description: "Antall dager tilbake (default 1)" },
          },
        },
        handler: async (input: unknown) => {
          const { days } = (input as { days?: number }) ?? {};
          return getRecentRuns(days ?? 1);
        },
      },
    ],
  };
}

// ─── Kronos — Schedule Optimizer ─────────────────────────────────────────

export class KronosAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Kronos",
    department: "operations",
    role: "scheduler",
    model: "haiku",
    description:
      "Schedule Optimizer. Analyserer agent-kjøringer, oppdager konflikter og foreslår tidsplan-justeringer.",
    schedule: "0 5 * * 1",
    systemPrompt: `Du er Kronos, Schedule Optimizer for Agent Imperie.

Din jobb er å sørge for at agentflåten opererer optimalt uten konflikter.

## ALLTID START HER
1. Kall get_agent_schedules — les gjeldende tidsplan for alle agenter
2. Kall get_recent_runs med days=7 — se faktisk kjøretid og varighet

Du analyserer ukentlig:
1. **Kjøretidskonflikter**: Kjører for mange tunge agenter (Opus) samtidig?
2. **Avhengighetsrekkefølge**: Kjører Ledger etter Nova og Quill? Kjører Hermes etter Nova?
3. **Kostnadoptimering**: Kan vi flytte Haiku-agenter til å kjøre oftere (billig) og Opus-agenter sjeldnere?
4. **Ubenyttet kapasitet**: Er det tider på dagen med ingen agent-aktivitet?
5. **Rate limit-risiko**: Er det agenter som kjører tett og kan trigge 429-feil mot Anthropic API?

Du produserer:
- En vurdering av gjeldende schedule
- Konkrete forslag til justeringer (agent-id + ny cron-expression)
- Estimert kostnadsbesparelse

Skriv på norsk. Vær presis med cron-expressions.`,
    tools: [
      {
        name: "get_agent_schedules",
        description: "Hent cron-schedule og modell for alle registrerte agenter",
        inputSchema: { type: "object", properties: {} },
        handler: async () => {
          // Lazy import to avoid circular dependency (registry → operations → registry)
          const { REGISTRY } = await import("@/lib/agents/registry");
          return Object.entries(REGISTRY).map(([id, agent]) => ({
            id,
            name: agent.definition.name,
            department: agent.definition.department,
            model: agent.definition.model,
            schedule: agent.definition.schedule ?? null,
          }));
        },
      },
      {
        name: "get_recent_runs",
        description: "Hent agent-kjøringer siste N dager — se faktisk kjøretid og varighet",
        inputSchema: {
          type: "object",
          properties: {
            days: { type: "number", description: "Antall dager tilbake (default 7)" },
          },
        },
        handler: async (input: unknown) => {
          const { days } = (input as { days?: number }) ?? {};
          return getRecentRuns(days ?? 7);
        },
      },
    ],
  };
}
