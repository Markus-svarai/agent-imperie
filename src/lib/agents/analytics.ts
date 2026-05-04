/**
 * Analytics department agents.
 * Scribe lives in scribe.ts — has custom run() logic.
 * Lens (data), Sage (market intel), Quill (synthesis/reporting).
 */

import { BaseAgent } from "./base";
import type { AgentDefinition } from "./types";
import { search } from "@/lib/tools/search";
import { getPipelineStats } from "@/lib/tools/find-clinics";
import { getRecentRuns } from "@/lib/tools/memory";
import { db, schema } from "@/lib/db";
import { eq, desc, gte, and } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";

// ─── Shared tool: get_artifacts ──────────────────────────────────────────────

async function getArtifacts(input: unknown) {
  const { agentName, type, days, limit } = (input as {
    agentName?: string;
    type?: string;
    days?: number;
    limit?: number;
  }) ?? {};

  const conditions = [eq(schema.artifacts.orgId, DEFAULT_ORG_ID)];

  if (type) {
    conditions.push(
      eq(schema.artifacts.type, type as typeof schema.artifacts.$inferSelect.type)
    );
  }
  if (days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    conditions.push(gte(schema.artifacts.createdAt, cutoff));
  }
  if (agentName) {
    const agent = await db.query.agents.findFirst({
      where: eq(schema.agents.name, agentName),
      columns: { id: true },
    });
    if (agent) {
      conditions.push(eq(schema.artifacts.agentId, agent.id));
    }
  }

  return db.query.artifacts.findMany({
    where: and(...conditions),
    orderBy: [desc(schema.artifacts.createdAt)],
    limit: limit ?? 20,
  });
}

// ─── Lens — Data Analyst ──────────────────────────────────────────────────

export class LensAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Lens",
    department: "analytics",
    role: "data",
    model: "sonnet",
    description:
      "Data Analyst. Overvåker KPI-dashbordet, oppdager anomalier og varsler Jarvis ved signifikante avvik.",
    schedule: "0 8 * * *",
    systemPrompt: `Du er Lens, Data Analyst for Agent Imperie / SvarAI.

Din jobb er å holde styr på tallene som betyr noe for SvarAI sin vekst.

## ALLTID START HER
1. Kall get_pipeline_stats — se nåværende salgsstatus
2. Kall get_recent_runs — sjekk agent-kjøringer siste 24 timer
3. Kall get_artifacts med agentName="Rex" for revenue-data

Du overvåker daglig:
1. **Salgsmetrikker**: Antall demos booket, konverteringsrate, pipeline-verdi
2. **Produktbruk**: Samtaler håndtert av AI, booking-rate, no-show rate
3. **Kostnader**: Token-forbruk per agent, cloud-kostnader, kostnad per lead
4. **Vekst**: Uke-over-uke utvikling på nøkkeltall

Du varsler umiddelbart (via Jarvis) hvis:
- Et nøkkeltall faller mer enn 20% uke-over-uke
- Kostnadene sprenges over budsjett
- Det er anomalier i agent-kjøringer (for mange feil, uvanlig lav aktivitet)

Skriv på norsk. Vær tallbasert og konsis. Bruk konkrete tall, ikke vage vurderinger.`,
    tools: [
      {
        name: "get_pipeline_stats",
        description: "Hent nåværende pipeline-status: leads, prospects, demos, klienter",
        inputSchema: { type: "object", properties: {} },
        handler: async () => getPipelineStats(),
      },
      {
        name: "get_recent_runs",
        description: "Hent sammendrag av alle agent-kjøringer siste N dager (default 1)",
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
      {
        name: "get_artifacts",
        description:
          "Hent agent-rapporter. Filtrer på agentName (f.eks. 'Rex'), type, eller dager.",
        inputSchema: {
          type: "object",
          properties: {
            agentName: { type: "string", description: "Filtrer på agent-navn" },
            type: { type: "string", description: "Filtrer på artifact-type" },
            days: { type: "number", description: "Hent artifacts fra siste N dager" },
            limit: { type: "number", description: "Maks antall resultater (default 20)" },
          },
        },
        handler: getArtifacts,
      },
    ],
  };
}

// ─── Sage — Market Intelligence ───────────────────────────────────────────

export class SageAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Sage",
    department: "analytics",
    role: "market",
    model: "sonnet",
    description:
      "Market Intelligence. Konkurrentovervåking, priser og posisjonering. Ukentlig rapport til Athena.",
    schedule: "0 7 * * 1",
    systemPrompt: `Du er Sage, Market Intelligence Agent for Agent Imperie / SvarAI.

Din jobb er å holde SvarAI ett steg foran konkurrentene.

## ALLTID START HER
Bruk web_search til å søke etter:
- "AI resepsjonist klinikk Norge" (konkurrenter)
- "telefonrobot booking helsevesen Norden" (trender)
- Konkrete konkurrentnavn + "priser" eller "ny funksjon"

Du analyserer ukentlig:
1. **Konkurrenter** (AI-resepsjonister, booking-systemer, telefonroboter i Norden):
   - Prisendringer
   - Nye features eller lanseringer
   - Markedsføringsstrategi
   - Kundeomtaler og klager

2. **Markedstrender**:
   - AI-adopsjon i norsk helsevesen
   - Regulatoriske endringer
   - Nye potensielle konkurrenter

3. **Muligheter**:
   - Nisjer SvarAI ikke dekker ennå
   - Partnerskapsmuligheter
   - Geografisk ekspansjon

Output: ukesrapport med rangerte funn og én strategisk anbefaling til Athena.
Skriv på norsk.`,
    tools: [
      {
        name: "web_search",
        description: "Søk på nettet etter markedsinformasjon, konkurrenter og trender",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Søkestreng" },
          },
          required: ["query"],
        },
        handler: async (input: unknown) => {
          const { query } = input as { query: string };
          return search(query, { maxResults: 5 });
        },
      },
    ],
  };
}

// ─── Quill — Report Synthesizer ──────────────────────────────────────────

export class QuillAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Quill",
    department: "analytics",
    role: "synthesizer",
    model: "sonnet",
    description:
      "Report Synthesizer. Sammenstiller output fra alle analytikere til én executive summary for Ledger.",
    schedule: "0 17 * * *",
    systemPrompt: `Du er Quill, Report Synthesizer for Agent Imperie.

Din jobb er å ta output fra alle analytikere og destillere det til ett klart, handlingsorientert sammendrag.

## ALLTID START HER
1. Kall get_recent_runs med days=1 — se hva alle agenter har gjort i dag
2. Kall get_artifacts med days=1 — les dagens rapporter fra Lens, Sage og Rex

Du samler data fra:
- Lens (data/KPI-er)
- Sage (markedsintelligens)
- Scribe (samtaleanalyse)
- Rex (revenue/pipeline)

Du produserer ett daglig executive summary:
1. **Dagens viktigste funn** (maks 3 punkter)
2. **Tall å merke seg** (2-3 nøkkeltall med kontekst)
3. **Anbefalt handling** (én konkret ting Markus bør gjøre i dag)

Vær ekstremt kortfattet. Ledger og Jarvis bruker dette som input — ikke gjenta alt, destiller det.
Skriv på norsk.`,
    tools: [
      {
        name: "get_recent_runs",
        description: "Hent sammendrag av alle agent-kjøringer siste N dager (default 1)",
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
      {
        name: "get_artifacts",
        description:
          "Hent agent-rapporter. Filtrer på agentName (f.eks. 'Lens', 'Rex', 'Sage'), type, eller dager.",
        inputSchema: {
          type: "object",
          properties: {
            agentName: { type: "string", description: "Filtrer på agent-navn" },
            type: { type: "string", description: "Filtrer på artifact-type" },
            days: { type: "number", description: "Hent artifacts fra siste N dager" },
            limit: { type: "number", description: "Maks antall resultater (default 20)" },
          },
        },
        handler: getArtifacts,
      },
    ],
  };
}
