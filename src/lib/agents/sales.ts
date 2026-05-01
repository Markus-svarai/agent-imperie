/**
 * Sales department agents.
 * Pipeline: Nova (prospects) → Hermes (outreach) → Titan (close) → Pulse (CRM) → Rex (reporting)
 * Nova and Hermes live in their own files — have tools for real-world actions.
 */

import { BaseAgent } from "./base";
import type { AgentDefinition } from "./types";
import { sendOutreachEmail, getRepliedLeads, getPendingLeads } from "@/lib/tools/send-outreach";
import { getPipelineStats } from "@/lib/tools/find-clinics";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";

// ─── Titan — Deal Closer ──────────────────────────────────────────────────

export class TitanAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Titan",
    department: "sales",
    role: "closer",
    model: "sonnet",
    description:
      "Deal Closer. Leser svar fra klinikker, håndterer innvendinger og sender oppfølging mot demo-booking.",
    schedule: "0 8 * * 1-5",
    systemPrompt: `Du er Titan, Deal Closer for SvarAI.

## ALLTID START HER
Kall get_pipeline_stats som aller første handling. Presenter status øverst i rapporten.

## Vår situasjon akkurat nå
SvarAI er i tidlig pilotfase. Vi har foreløpig ingen betalende kunder.
Vi tilbyr de første 2-3 klinikkene pilotplass — 100% gratis.
Målet ditt er å konvertere svar og interesse til bookede demoer.

## Jobb-flyt
1. Kall get_pipeline_stats — vis status øverst
2. Kall get_replied_leads — se hvem som har svart
3. For positive svar: send oppfølging mot demo-booking
4. For innvendinger: håndter dem direkte og tilby pilotplass
5. Kall update_lead_status for å holde pipelinen oppdatert

## Vanlige innvendinger i pilotfase
- "Hva koster det?" → "Ingenting — vi er i pilotfase og tilbyr dette gratis til de første klinikkene"
- "Ikke klar for AI" → "Derfor vil vi ha deg som pilotkunde — du hjelper oss gjøre det enkelt"
- "Har prøvd lignende" → Spør hva som gikk galt, adresser direkte
- "Ingen tid" → "15 minutter, ikke mer — og du bestemmer om det er verdt det"

Calendly-link for demo: ${process.env.CALENDLY_LINK ?? "https://calendly.com/svarai/demo"}

Skriv på norsk. Vær direkte, varm og løsningsorientert.`,
    tools: [
      {
        name: "get_pipeline_stats",
        description: "Hent nåværende pipeline-status — kall dette først i hver kjøring",
        inputSchema: { type: "object", properties: {} },
        handler: async () => getPipelineStats(),
      },
      {
        name: "get_replied_leads",
        description: "Hent leads som har svart på outreach og venter på oppfølging",
        inputSchema: { type: "object", properties: {} },
        handler: async () => getRepliedLeads(),
      },
      {
        name: "get_pending_followup",
        description: "Hent leads som ikke har svart på X dager og trenger oppfølging",
        inputSchema: {
          type: "object",
          properties: {
            daysSince: { type: "number", description: "Dager siden siste kontakt" },
          },
        },
        handler: async (input: unknown) => {
          const { daysSince } = (input as { daysSince?: number }) ?? {};
          return getPendingLeads(daysSince ?? 4);
        },
      },
      {
        name: "send_reply",
        description: "Send oppfølgings-e-post til et lead",
        inputSchema: {
          type: "object",
          properties: {
            to: { type: "string" },
            subject: { type: "string" },
            body: { type: "string" },
            leadId: { type: "string" },
          },
          required: ["to", "subject", "body"],
        },
        handler: async (input: unknown) =>
          sendOutreachEmail(input as Parameters<typeof sendOutreachEmail>[0]),
      },
      {
        name: "update_lead_status",
        description: "Oppdater status på et lead i pipelinen",
        inputSchema: {
          type: "object",
          properties: {
            leadId: { type: "string" },
            status: {
              type: "string",
              enum: ["contacted", "replied", "interested", "demo_booked", "not_interested"],
            },
            notes: { type: "string" },
          },
          required: ["leadId", "status"],
        },
        handler: async (input: unknown) => {
          const { leadId, status, notes } = input as {
            leadId: string;
            status: string;
            notes?: string;
          };
          await db
            .update(schema.leads)
            .set({
              status: status as typeof schema.leads.$inferSelect.status,
              notes: notes ?? undefined,
              updatedAt: new Date(),
            })
            .where(eq(schema.leads.id, leadId));
          return { ok: true };
        },
      },
    ],
  };
}

// ─── Pulse — CRM Keeper ───────────────────────────────────────────────────

export class PulseAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Pulse",
    department: "sales",
    role: "crm",
    model: "haiku",
    description:
      "CRM Keeper. Overvåker pipeline-helse, flagger stale leads og sender daglig prioriteringsliste.",
    schedule: "0 17 * * 1-5",
    systemPrompt: `Du er Pulse, CRM Keeper for SvarAI.

Din jobb er å holde salgspipelinen ren og synlig for Markus.

## Kontekst
SvarAI er i tidlig pilotfase — vi søker de første 2-3 pilotklinikkene.
Pipeline-helse er kritisk fordi vi ikke har råd til å miste varme leads.

Du sjekker daglig:
1. **Pipeline-oversikt** — vis alltid totalt antall leads per status øverst
2. **Stale leads** — prospekter som ikke har vært kontaktet på 5+ dager
3. **Varme leads** — hvem har svart, vist interesse, booket demo?
4. **Manglende oppfølging** — avtaler om å komme tilbake som ikke er gjort
5. **Pipeline-hygiene** — leads uten status, feil fase, dupliserte kontakter

Du produserer:
- Pipeline-status øverst (antall per fase)
- En prioritert liste over leads som trenger handling i dag
- Flag på leads som bør arkiveres

Skriv på norsk. Vær konkret — klinikknavn, dato, anbefalt neste handling.`,
    tools: [
      {
        name: "get_pipeline",
        description: "Hent alle aktive leads og deres nåværende status",
        inputSchema: { type: "object", properties: {} },
        handler: async () => {
          return db.query.leads.findMany({
            where: (leads, { and, eq, notInArray }) =>
              and(
                eq(leads.orgId, DEFAULT_ORG_ID),
                notInArray(leads.status, ["customer", "not_interested", "unsubscribed"])
              ),
            orderBy: (leads, { desc }) => [desc(leads.updatedAt)],
            limit: 50,
          });
        },
      },
    ],
  };
}

// ─── Rex — Revenue Analyst ────────────────────────────────────────────────

export class RexAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Rex",
    department: "sales",
    role: "revenue",
    model: "sonnet",
    description:
      "Revenue Analyst. Pipeline-analyse, konverteringsrater og ukentlig ARR-prognose.",
    schedule: "0 9 * * 5",
    systemPrompt: `Du er Rex, Revenue Analyst for SvarAI.

Din jobb er å gi Markus en presis, ærlig forståelse av pipeline-helse og vei til første inntekt.

## Kontekst
SvarAI er i tidlig pilotfase. 0 betalende kunder.
Målet er 2-3 pilotklinikker gratis → deretter konvertere til betalende.
Forventet månedspris per klinikk: 1 500–3 000 kr/mnd.

Du analyserer ukentlig:
1. **Pipeline-status** — vis alltid antall leads per fase øverst
2. **Fremdrift mot pilotmål** — er vi på vei til å fylle de 2-3 pilotplassene?
3. **Konverteringsrater** — fra prospekt → kontaktet → svar → demo → pilot
4. **Aktivitetsnivå** — sendte Nova nok nye leads denne uken? Svarte Hermes raskt?
5. **ARR-prognose** — realistisk estimat gitt nåværende pipeline
6. **Flaskehalser** — hvor stopper leads opp?

Format: kortfattet rapport med faktiske tall, trender og én konkret anbefaling til Markus.
Start alltid med pipeline-oversikten. Skriv på norsk. Vær ærlig — ikke overdriv potensial.`,
    tools: [
      {
        name: "get_pipeline_stats",
        description: "Hent pipeline-statistikk fordelt på status",
        inputSchema: { type: "object", properties: {} },
        handler: async () => {
          const allLeads = await db.query.leads.findMany({
            where: (leads, { eq }) => eq(leads.orgId, DEFAULT_ORG_ID),
          });
          const byStatus = allLeads.reduce<Record<string, number>>((acc, lead) => {
            acc[lead.status] = (acc[lead.status] ?? 0) + 1;
            return acc;
          }, {});
          return { total: allLeads.length, byStatus };
        },
      },
    ],
  };
}
