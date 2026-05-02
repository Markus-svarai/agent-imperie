/**
 * Command department agents — the strategic layer of Agent Imperie.
 * Athena (strategy), Oracle (intelligence), Nexus (coordination).
 * Jarvis lives in jarvis.ts because it has custom run() logic.
 */

import { BaseAgent } from "./base";
import type { AgentDefinition } from "./types";
import { searchMany } from "@/lib/tools/search";
import { getPipelineStats } from "@/lib/tools/find-clinics";
import { getRecentRuns, getAllMemory, getPendingProposals, createStrategyProposal, setMemory } from "@/lib/tools/memory";
import { db, schema } from "@/lib/db";
import { eq, desc, gte, and } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";

// ─── Athena — Chief Strategy Officer ────────────────────────────────────────

export class AthenaAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Athena",
    department: "command",
    role: "strategist",
    model: "opus",
    description:
      "Chief Strategy Officer. Leser hva alle agenter har gjort, identifiserer hva som ikke virker, og sender Markus konkrete strategiforslag.",
    schedule: "0 8 * * 1",
    systemPrompt: `Du er Athena, Chief Strategy Officer for SvarAI.

## ALLTID START HER — fire obligatoriske steg
1. Kall get_pipeline_stats — se nåværende salgsstatus
2. Kall get_recent_runs — les hva alle agenter har gjort siste 7 dager
3. Kall get_all_agent_memory — les hva agentene har lært
4. Kall get_artifacts — les de viktigste analysene (Rex, Scribe, Lens)

## Din jobb
Du er den eneste agenten som ser hele bildet. Ditt ansvar:
- Identifiser hva som IKKE virker (og hvorfor)
- Finn mønstre på tvers av agenter
- Kom med konkrete forbedringsforslag — ikke generell strategi
- Foreslå nye ideer Markus kan prøve

## Alltid lever
1. **Situasjonsanalyse** — hva er status akkurat nå, basert på faktiske tall
2. **Hva fungerer ikke** — vær ærlig og spesifikk
3. **3 konkrete forslag** med prioritet (høy/medium/lav) og hvem som bør gjøre det
4. **Én ny idé** — noe vi ikke har prøvd ennå

## Etter analysen
Kall create_strategy_proposal for å lagre forslagene dine.
Dette gjør at Markus ser dem i dashboardet og kan si ja/nei.

Skriv på norsk. Vær direkte og ærlig — ikke ros det som ikke virker.`,
    tools: [
      {
        name: "get_pipeline_stats",
        description: "Hent nåværende pipeline-status",
        inputSchema: { type: "object", properties: {} },
        handler: async () => getPipelineStats(),
      },
      {
        name: "get_recent_runs",
        description: "Hent sammendrag av alle agent-kjøringer siste N dager",
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
      {
        name: "get_all_agent_memory",
        description: "Les hva Nova, Hermes og Titan har lært",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string", description: "nova, hermes, titan, eller blank for alle" },
          },
        },
        handler: async (input: unknown) => {
          const { agentId } = (input as { agentId?: string }) ?? {};
          if (agentId) return getAllMemory(agentId);
          const [nova, hermes, titan] = await Promise.all([
            getAllMemory("nova"),
            getAllMemory("hermes"),
            getAllMemory("titan"),
          ]);
          return { nova, hermes, titan };
        },
      },
      {
        name: "get_artifacts",
        description: "Hent agent-rapporter. Filtrer på agentNavn (f.eks. 'Rex', 'Scribe', 'Lens'), type ('report', 'analysis', 'prospect_list', 'outreach', 'alert'), eller dager tilbake.",
        inputSchema: {
          type: "object",
          properties: {
            agentName: { type: "string", description: "Filtrer på agent-navn, f.eks. 'Rex'" },
            type: { type: "string", description: "Filtrer på artifact-type" },
            days: { type: "number", description: "Hent artifacts fra siste N dager (default: alle)" },
            limit: { type: "number", description: "Maks antall resultater (default 20)" },
          },
        },
        handler: async (input: unknown) => {
          const { agentName, type, days, limit } = (input as {
            agentName?: string;
            type?: string;
            days?: number;
            limit?: number;
          }) ?? {};

          // Build WHERE conditions
          const conditions = [eq(schema.artifacts.orgId, DEFAULT_ORG_ID)];

          if (type) {
            conditions.push(eq(schema.artifacts.type, type as typeof schema.artifacts.$inferSelect.type));
          }
          if (days) {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            conditions.push(gte(schema.artifacts.createdAt, cutoff));
          }

          // If filtering by agent name, join to get agent ID first
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
        },
      },
      {
        name: "search_market",
        description: "Søk etter markedsinformasjon, konkurrenter eller trender",
        inputSchema: {
          type: "object",
          properties: {
            queries: {
              type: "array",
              items: { type: "string" },
              description: "Liste med søkestrenger",
            },
          },
          required: ["queries"],
        },
        handler: async (input: unknown) => {
          const { queries } = input as { queries: string[] };
          // Convert array to Record so searchMany is satisfied
          const queryMap = Object.fromEntries(queries.map((q, i) => [`q${i}`, q]));
          return searchMany(queryMap, { maxResults: 3 });
        },
      },
      {
        name: "create_strategy_proposal",
        description: "Lagre et strategiforslag som Markus ser i dashboardet",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            summary: { type: "string" },
            proposals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  problem: { type: "string" },
                  suggestion: { type: "string" },
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                },
                required: ["area", "problem", "suggestion", "priority"],
              },
            },
          },
          required: ["title", "summary", "proposals"],
        },
        handler: async (input: unknown) => {
          const { title, summary, proposals } = input as {
            title: string;
            summary: string;
            proposals: Array<{ area: string; problem: string; suggestion: string; priority: "high" | "medium" | "low" }>;
          };
          const id = await createStrategyProposal({ createdBy: "athena", title, summary, proposals });
          return { ok: true, id };
        },
      },
      {
        name: "set_memory",
        description: "Lagre strategisk kontekst for fremtidige refleksjoner",
        inputSchema: {
          type: "object",
          properties: {
            key: { type: "string" },
            value: {},
          },
          required: ["key", "value"],
        },
        handler: async (input: unknown) => {
          const { key, value } = input as { key: string; value: unknown };
          await setMemory("athena", key, value);
          return { ok: true };
        },
      },
    ],
  };
}

// ─── Oracle — Intelligence Director ─────────────────────────────────────────

export class OracleAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Oracle",
    department: "command",
    role: "intelligence",
    model: "sonnet",
    description:
      "Intelligence Director. Overvåker konkurrenter, markedssignaler og industritrender daglig.",
    schedule: "0 7 * * *",
    systemPrompt: `Du er Oracle, Intelligence Director for Agent Imperie.

Din jobb er å holde Markus og Athena oppdatert på hva som skjer i markedet.

Du overvåker:
- Konkurrenter til SvarAI (AI-resepsjonister, booking-software, telefonroboter i Norge)
- Markedssignaler (nye investeringer, produktlanseringer, priser)
- Industritrender (AI i helsesektoren, klinikk-automatisering i Norden)
- Potensielle trusler og muligheter

Du leverer daglig:
- Top 3 viktigste signaler fra markedet
- Konkurrentoppdateringer (hva er nytt?)
- En anbefaling: bør noe endres i SvarAI sin strategi?

Skriv på norsk. Vær presis og faktusorientert. Unngå spekulasjon uten belegg.`,
    tools: [],
  };
}

// ─── Nexus — Chief of Staff ───────────────────────────────────────────────

export class NexusAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Nexus",
    department: "command",
    role: "coordinator",
    model: "sonnet",
    description:
      "Chief of Staff. Koordinerer avdelinger, løser konflikter og sender daglig prioriteringskø til Jarvis.",
    schedule: "30 6 * * *",
    systemPrompt: `Du er Nexus, Chief of Staff for Agent Imperie.

Din jobb er å sørge for at agentflåten opererer koordinert og uten friksjon.

Du håndterer:
- Prioriteringskonflikter mellom avdelinger
- Avhengigheter (hvilke agenter venter på output fra andre?)
- Kapasitetsoversikt (er noen agenter overbelastet?)
- Eskalering til Jarvis når noe trenger beslutning

Du produserer daglig:
- En prioritert liste over hva som bør kjøre i dag
- Eventuelle konflikter eller blokkere som må løses
- Status på pågående agent-pipelines

Skriv på norsk. Vær organisert, presis og handlekraftig.`,
    tools: [],
  };
}
