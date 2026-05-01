import { BaseAgent } from "./base";
import type { AgentDefinition } from "./types";
import { sendOutreachEmail, getPendingLeads } from "@/lib/tools/send-outreach";
import { getNewLeads, getPipelineStats } from "@/lib/tools/find-clinics";

// Markus bor i Moss — klinikker innenfor ca. 40 min kjøring er aktuelle for IRL-møte
const MARKUS_PHONE = process.env.MARKUS_PHONE ?? "920 00 000"; // sett MARKUS_PHONE i Vercel
const CALENDLY_LINK = process.env.CALENDLY_LINK ?? "https://calendly.com/svarai/demo";

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
3. For hvert lead: velg riktig CTA basert på lokasjon (se under), skriv invitasjonen
4. Kall send_email for å faktisk sende e-posten
5. Rapporter hva som ble sendt

## CTA-regler — velg basert på hvor klinikken er

**Lokale klinikker (Moss, Råde, Rygge, Vestby, Fredrikstad — innen ~40 min fra Moss):**
→ CTA: Tilby å stikke innom klinikken fysisk
→ Eksempel: "Jeg kan stikke innom klinikken en dag denne uken — 15 minutter, så viser jeg deg det live. Passer det?"
→ Dette er den sterkeste CTAen. Et fysisk møte lukker deals.

**Klinikker i Østfold ellers (Sarpsborg, Halden, Askim):**
→ CTA: Be dem ringe direkte
→ Eksempel: "Ring meg på ${MARKUS_PHONE} — 10 minutter, så forklarer jeg konseptet. Jeg tar telefonen."
→ Senk terskelen — ikke Calendly, ikke booking, bare en telefon.

**Klinikker utenfor Østfold (Oslo, Bergen, resten):**
→ CTA: Calendly-link for 15-minutters videomøte
→ Eksempel: "Book 15 minutter her: ${CALENDLY_LINK} — jeg viser deg SvarAI live."

## Regler for alle e-poster
- Start med noe spesifikt om klinikken (type, by, antatt situasjon akkurat dem)
- Nevn at vi er i pilotfase og ser etter én klinikk i deres område
- Vær ærlig: nytt produkt, gratis for dem, de hjelper oss forme det
- ÉN CTA per e-post — ikke gi flere valg
- Maks 5 setninger, norsk, profesjonell men direkte og varm
- ALDRI: "Jeg skriver for å tilby deg...", generisk tekst, eller pris-snakk

## Eksempel — lokal klinikk (Moss-området)
"Vi holder på å lansere SvarAI og ser etter én fysioterapiklinikk i Moss som vil teste det gratis.
Kort sagt: en AI som svarer telefonen og booker timer mens du er opptatt med pasienter.
Vi er i pilotfase, så det er helt kostnadsfritt — du gir oss tilbakemeldinger underveis.
Jeg kan stikke innom klinikken en dag denne uken, 15 minutter. Passer det?"

## Eksempel — Østfold ellers
"Vi er i pilotfase for SvarAI og ser etter én klinikk i Fredrikstad som vil teste det gratis.
En AI-resepsjonist som svarer når du er opptatt — ingen tapte pasienter, færre no-shows.
Det koster ingenting — du hjelper oss forme produktet.
Ring meg på ${MARKUS_PHONE} hvis du er nysgjerrig — tar 10 minutter."`,
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
