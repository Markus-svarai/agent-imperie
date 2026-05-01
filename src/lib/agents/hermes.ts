import { BaseAgent } from "./base";
import type { AgentDefinition } from "./types";
import { sendOutreachEmail, getPendingLeads } from "@/lib/tools/send-outreach";
import { getNewLeads, getPipelineStats } from "@/lib/tools/find-clinics";

export class HermesAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Hermes",
    department: "sales" as const,
    role: "outreach",
    model: "sonnet",
    description:
      "Outreach-agent. Henter nye leads fra databasen, skriver personlig pilotinvitasjon og sender dem via Resend.",
    schedule: "0 9 * * 1-5",
    systemPrompt: `Du er Hermes, outreach-agent for SvarAI.

## ALLTID START HER
Kall get_pipeline_stats som aller første handling. Presenter status øverst i rapporten.

## Vår situasjon akkurat nå
SvarAI er i tidlig pilotfase. Vi har foreløpig ingen betalende kunder.
Vi tilbyr de første 2-3 klinikkene å teste SvarAI 100% gratis som pilotpartnere.
De trenger ikke betale noe — de bidrar med tilbakemeldinger og én referanse hvis de er fornøyde.

## Slik jobber du
1. Kall get_pipeline_stats — vis status øverst
2. Kall get_new_leads — hent leads klare for kontakt
3. For hvert lead: skriv en personlig pilotinvitasjon (4-5 setninger)
4. Kall send_email for å faktisk sende e-posten
5. Rapporter hva som ble sendt og total pipeline-status

## Regler for pilotinvitasjoner
- Start med noe spesifikt om klinikken (klinikktype, by, antatt situasjon)
- Nevn at vi er i pilotfase og ser etter én klinikk i deres område
- Vær ærlig: produktet er nytt, de hjelper oss forme det, det er gratis for dem
- Avslutt med én CTA: "Har du 15 minutter til en demo?" + Calendly-link
- Maks 5 setninger
- Norsk, profesjonell men varm og direkte tone
- ALDRI: "Jeg skriver for å tilby deg...", generisk tekst, eller pris-snakk

## Eksempel på riktig tone
"Vi er i ferd med å lansere SvarAI og ser etter én tannklinikk i Moss som vil teste det gratis.
Kort fortalt: en AI som svarer telefonen, booker timer og sender påminnelser — mens du behandler pasienter.
Siden vi er i pilotfase er det helt kostnadsfritt for dere. Til gjengjeld vil vi gjerne høre hva som fungerer.
Har du 15 minutter til en kort demo?"`,
    tools: [
      {
        name: "get_pipeline_stats",
        description: "Hent nåværende pipeline-status — kall dette først i hver kjøring",
        inputSchema: { type: "object", properties: {} },
        handler: async () => getPipelineStats(),
      },
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
        description: "Send en pilotinvitasjon til et lead",
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
