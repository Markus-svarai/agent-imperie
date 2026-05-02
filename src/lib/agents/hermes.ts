import { BaseAgent } from "./base";
import type { AgentDefinition } from "./types";
import { sendOutreachEmail, getPendingLeads } from "@/lib/tools/send-outreach";
import { getNewLeads, getPipelineStats } from "@/lib/tools/find-clinics";
import { getAllMemory, setMemory, appendMemory } from "@/lib/tools/memory";

const MARKUS_PHONE = process.env.MARKUS_PHONE ?? "921 67 470";
const CALENDLY_LINK = process.env.CALENDLY_LINK ?? "https://calendly.com/svarai/demo";

export class HermesAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Hermes",
    department: "sales" as const,
    role: "outreach",
    model: "sonnet",
    description:
      "Outreach-agent. Skriver og sender personlige pilotinvitasjoner — og lærer av hvilke tilnærminger som gir svar.",
    schedule: "0 9 * * 1-5",
    systemPrompt: `Du er Hermes, outreach-agent for SvarAI.

## ALLTID START HER
1. Kall get_pipeline_stats — vis status øverst
2. Kall get_all_memory — les hva du har lært om hva som virker

## Vår situasjon
SvarAI er i pilotfase. Vi tilbyr de første 2-3 klinikkene å teste gratis.
Bruk hukommelsen din: hvilke emnelinjer ga svar? Hvilke åpninger fungerte ikke?

## Slik jobber du
1. get_pipeline_stats → get_all_memory
2. get_new_leads — hent leads klare for kontakt
3. Skriv personlig pilotinvitasjon med riktig CTA (se under)
4. send_email — send faktisk e-posten
5. **Etter kjøringen: kall set_memory** med hva du prøvde og hva du tror vil fungere

## CTA basert på lokasjon

**Moss / nærområde (Råde, Rygge, Vestby — innen ~30 min):**
→ "Jeg kan stikke innom klinikken en dag denne uken — 15 minutter, så viser jeg deg det live. Passer det?"

**Østfold ellers (Fredrikstad, Sarpsborg, Halden):**
→ "Ring meg på ${MARKUS_PHONE} — 10 minutter, så forklarer jeg konseptet. Jeg tar telefonen."

**Utenfor Østfold:**
→ "Book 15 minutter her: ${CALENDLY_LINK}"

## Regler for alle e-poster
- Start med noe spesifikt om klinikken (type, by, antatt situasjon)
- Nevn pilotfase og at det er gratis
- ÉN CTA per e-post — ikke gi valg
- Maks 5 setninger, norsk, direkte og varm tone
- ALDRI generiske åpninger som "Jeg skriver for å tilby..."

## Lær og forbedre
Etter hver batch: noter i memory hvilke emnelinjer, åpninger og CTAer du brukte.
Neste kjøring: varier og test nye varianter basert på hva som fikk svar.`,
    tools: [
      {
        name: "get_pipeline_stats",
        description: "Hent nåværende pipeline-status",
        inputSchema: { type: "object", properties: {} },
        handler: async () => getPipelineStats(),
      },
      {
        name: "get_all_memory",
        description: "Les alt Hermes har lært om hva som gir svar",
        inputSchema: { type: "object", properties: {} },
        handler: async () => getAllMemory("hermes"),
      },
      {
        name: "get_new_leads",
        description: "Hent leads klare for første kontakt",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number" },
          },
        },
        handler: async (input: unknown) => {
          const { limit } = (input as { limit?: number }) ?? {};
          return getNewLeads(limit ?? 5);
        },
      },
      {
        name: "get_pending_followup",
        description: "Hent leads kontaktet for X dager siden uten svar",
        inputSchema: {
          type: "object",
          properties: {
            daysSince: { type: "number" },
          },
        },
        handler: async (input: unknown) => {
          const { daysSince } = (input as { daysSince?: number }) ?? {};
          return getPendingLeads(daysSince ?? 3);
        },
      },
      {
        name: "send_email",
        description: "Send en pilotinvitasjon til et lead",
        inputSchema: {
          type: "object",
          properties: {
            to: { type: "string" },
            toName: { type: "string" },
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
        name: "set_memory",
        description: "Lagre en lærdom — f.eks. hvilke emnelinjer du brukte, hvilke åpninger du testet",
        inputSchema: {
          type: "object",
          properties: {
            key: { type: "string", description: "f.eks. 'subject_lines_tried', 'best_openings', 'cta_results'" },
            value: {},
          },
          required: ["key", "value"],
        },
        handler: async (input: unknown) => {
          const { key, value } = input as { key: string; value: unknown };
          await setMemory("hermes", key, value);
          return { ok: true };
        },
      },
      {
        name: "append_memory",
        description: "Legg til ett element i en memory-liste",
        inputSchema: {
          type: "object",
          properties: {
            key: { type: "string" },
            item: {},
          },
          required: ["key", "item"],
        },
        handler: async (input: unknown) => {
          const { key, item } = input as { key: string; item: unknown };
          await appendMemory("hermes", key, item);
          return { ok: true };
        },
      },
    ],
  };
}
