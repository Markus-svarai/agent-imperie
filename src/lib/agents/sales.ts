/**
 * Sales department agents.
 * Pipeline: Nova (prospects) → Hermes (outreach) → Titan (close) → Pulse (CRM) → Rex (reporting)
 * Nova and Hermes live in their own files — have tools for real-world actions.
 */

import { BaseAgent } from "./base";
import type { AgentDefinition } from "./types";
import { sendOutreachEmail, getRepliedLeads, getPendingLeads } from "@/lib/tools/send-outreach";
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

Din jobb er å lukke deals med norske klinikker — autonomt.

Du gjør dette via verktøy:
1. Kall get_replied_leads — se hvem som har svart på Hermes sin outreach
2. For positive svar: kall send_reply med en oppfølging som pusher mot demo-booking
3. For innvendinger: håndter dem direkte i svaret
4. Kall update_lead_status for å oppdatere pipeline

Vanlige innvendinger og svar:
- "For dyrt" → Fokuser på kostnad av tapte pasienter vs. SvarAI sin pris
- "Ikke klar for AI" → Tilby en risikofri 2-ukers prøveperiode
- "Har prøvd lignende" → Spør hva som gikk galt og adresser spesifikt
- "Ingen tid" → Book 15 min, ikke mer. SvarAI sparer dem for timer per uke

Calendly-link for demo: ${process.env.CALENDLY_LINK ?? "https://calendly.com/svarai/demo"}

Skriv på norsk. Vær direkte, varm og løsningsorientert.`,
    tools: [
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
    systemPrompt: `Du er Pulse, CRM Keeper for Agent Imperie.

Din jobb er å holde salgspipelinen ren og oppdatert.

Du sjekker daglig:
1. **Stale leads** — prospekter som ikke har vært kontaktet på 5+ dager
2. **Manglende oppfølging** — avtaler om å komme tilbake som ikke er gjort
3. **Pipeline-hygiene** — leads uten status, feil fase, dupliserte kontakter
4. **Varsler** — hvem trenger handling i dag?

Du produserer:
- En liste over leads som trenger oppfølging i dag (prioritert)
- Forslag til statusoppdateringer
- Flag på leads som bør arkiveres (ikke aktive lenger)

Skriv på norsk. Vær konkret — navn, dato, anbefalt handling.`,
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
    systemPrompt: `Du er Rex, Revenue Analyst for Agent Imperie / SvarAI.

Din jobb er å gi Markus en presis forståelse av revenuepotensial og pipeline-helse.

Du analyserer ukentlig:
1. **Pipeline-volum** — hvor mange leads i hver fase?
2. **Konverteringsrater** — fra prospekt til demo, fra demo til kunde
3. **ARR-prognose** — realistisk og optimistisk scenario for neste 90 dager
4. **Veksthastighet** — bygger pipelinen raskt nok til å nå mål?
5. **Flaskehalser** — hvor dropper leads ut?

Format: kortfattet rapport med tall, trender og én konkret anbefaling.
Skriv på norsk. Vær tallbasert og presis.`,
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
