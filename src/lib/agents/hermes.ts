import { BaseAgent } from "./base";
import type { AgentDefinition } from "./types";
import { sendOutreachEmail, getPendingLeads } from "@/lib/tools/send-outreach";
import { getNewLeads } from "@/lib/tools/find-clinics";

export class HermesAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Hermes",
    department: "sales" as const,
    role: "outreach",
    model: "sonnet",
    description:
      "Outreach-agent. Henter nye leads fra databasen, skriver personlig e-post og sender dem via Resend.",
    schedule: "0 9 * * 1-5",
    systemPrompt: `Du er Hermes, en presis og overbevisende outreach-agent for SvarAI.

Din jobb er å skrive og SENDE personlige e-poster til klinikker på vegne av SvarAI.

SvarAI er en AI-resepsjonist som:
- Svarer telefonen 24/7 — ingen tapte pasienter
- Booker timer automatisk
- Reduserer no-show med SMS-påminnelser
- Frigjør tid for klinikken — ingen behov for dedikert resepsjonist

Slik jobber du:
1. Kall get_new_leads for å hente leads klare for kontakt
2. For hvert lead: skriv en personlig e-post (4-5 setninger, ALDRI generisk)
3. Kall send_email for å faktisk sende e-posten
4. Rapporter hva som ble sendt

Regler for outreach-meldinger:
- Start med noe spesifikt om klinikken (klinikktype, by, antatt utfordring)
- Nevn ett konkret problem SvarAI løser for dem
- Avslutt med én CTA: "Book en gratis 15-minutters demo her:"
- Maks 5 setninger
- Norsk, profesjonell men varm tone
- ALDRI: "Jeg skriver for å tilby deg...", "Som leder av..."`,
    tools: [
      {
        name: "get_new_leads",
        description: "Hent leads fra databasen som er klare for første kontakt",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Maks antall leads å hente (default 5)" },
          },
        },
        handler: async (input: unknown) => {
          const { limit } = (input as { limit?: number }) ?? {};
          return getNewLeads(limit ?? 5);
        },
      },
      {
        name: "get_pending_followup",
        description: "Hent leads som ble kontaktet for X dager siden uten svar — klar for oppfølging",
        inputSchema: {
          type: "object",
          properties: {
            daysSince: { type: "number", description: "Dager siden siste kontakt (default 3)" },
          },
        },
        handler: async (input: unknown) => {
          const { daysSince } = (input as { daysSince?: number }) ?? {};
          return getPendingLeads(daysSince ?? 3);
        },
      },
      {
        name: "send_email",
        description: "Send en outreach-e-post til et lead",
        inputSchema: {
          type: "object",
          properties: {
            to: { type: "string", description: "Mottakers e-postadresse" },
            toName: { type: "string", description: "Mottakers navn (valgfritt)" },
            subject: { type: "string", description: "E-postemne" },
            body: { type: "string", description: "E-posttekst (plain text, ingen HTML)" },
            leadId: { type: "string", description: "Lead-ID fra databasen" },
          },
          required: ["to", "subject", "body"],
        },
        handler: async (input: unknown) => {
          return sendOutreachEmail(input as Parameters<typeof sendOutreachEmail>[0]);
        },
      },
    ],
  };
}
