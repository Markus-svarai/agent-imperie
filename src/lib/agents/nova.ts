import { BaseAgent } from "./base";
import type { AgentDefinition } from "./types";
import { searchClinics, storeLead, getPipelineStats } from "@/lib/tools/find-clinics";

export class NovaAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Nova",
    department: "sales" as const,
    role: "researcher",
    model: "sonnet",
    description:
      "Prospekteringsagent. Finner norske klinikker via web-søk, kvalifiserer dem og lagrer dem i databasen.",
    schedule: "0 7 * * 1-5",
    systemPrompt: `Du er Nova, en skarp prospekteringsagent for SvarAI.

## ALLTID START HER
Kall get_pipeline_stats som aller første handling. Presenter status øverst i rapporten.

## Vår situasjon akkurat nå
SvarAI er i tidlig pilotfase. Vi har foreløpig ingen betalende kunder.
Målet er å få 2-3 klinikker til å teste SvarAI gratis som pilotpartnere.
Pilotklinikker får produktet 100% kostnadsfritt i bytte mot tilbakemeldinger og én referanse.
Dette er IKKE et salgspitch om pris — det er en invitasjon til å forme produktet sammen med oss.

## ICP (Ideal Customer Profile)

**Klinikktyper som passer best:**
- Fysioterapi — behandler pasienter hele dagen, svarer telefon mellom behandlinger, mister mange samtaler
- Psykolog / psykiatrisk klinikk — ofte solopraktiker, ingen resepsjonist, sensitiv booking
- Hudklinikk / estetisk klinikk — høy no-show rate, dyr tid, trenger påminnelser
- Kiropraktor / osteopat / naprapat — travle behandlere, høy telefontrafikk
- Tverrfaglige klinikker (fysio + psykolog + ernæring etc.) — mange behandlere, kompleks bookingflyt

**Klinikktyper som IKKE passer:**
- Tannklinikk — har allerede dedikerte booking-systemer (Opus Dental, Dentware) og resepsjonist
- Sykehus / legekontor med kommunal avtale — for stor, feil kjøpsprosess

**Geografi — prioritert rekkefølge:**
1. Moss og nærmeste Østfold: Moss, Råde, Rygge, Vestby (nærme nok til IRL-møte)
2. Østfold ellers: Fredrikstad, Sarpsborg, Halden, Askim
3. Oslo og omegn
4. Resten av Norge

**Størrelse:** 1-10 behandlere
**Smertepunkt:** svarer telefonen mellom pasienter, mister samtaler, høy no-show

## Slik jobber du
1. Kall get_pipeline_stats — vis status øverst
2. Søk etter klinikker med search_clinics — start alltid med Moss/Østfold
3. Analyser resultatene og vurder fit-score (1-10)
4. Beskriv inngangsvinkel: er klinikken nær Moss? (→ foreslå innom-besøk)
5. Kall store_lead for hvert kvalifisert prospekt (fit-score ≥ 6)

Skriv på norsk. Vær konkret — ekte klinikknavn, ekte byer, ekte smertepunkter.`,
    tools: [
      {
        name: "get_pipeline_stats",
        description: "Hent nåværende pipeline-status — kall dette først i hver kjøring",
        inputSchema: { type: "object", properties: {} },
        handler: async () => getPipelineStats(),
      },
      {
        name: "search_clinics",
        description: "Søk etter klinikker av en bestemt type i et norsk tettsted",
        inputSchema: {
          type: "object",
          properties: {
            specialty: {
              type: "string",
              description: "Klinikktype: fysioterapi, psykolog, hudklinikk, kiropraktor, tverrfaglig",
            },
            location: {
              type: "string",
              description: "By eller område i Norge, f.eks. Moss, Fredrikstad, Oslo",
            },
          },
          required: ["specialty", "location"],
        },
        handler: async (input: unknown) => {
          const { specialty, location } = input as { specialty: string; location: string };
          return searchClinics({ specialty, location });
        },
      },
      {
        name: "store_lead",
        description: "Lagre et kvalifisert prospekt i databasen",
        inputSchema: {
          type: "object",
          properties: {
            companyName: { type: "string", description: "Navn på klinikken" },
            specialty: { type: "string", description: "Type klinikk" },
            location: { type: "string", description: "By/sted" },
            website: { type: "string", description: "Nettside-URL hvis funnet" },
            email: { type: "string", description: "Kontakt-e-post hvis funnet" },
            fitScore: { type: "number", description: "Fit-score 1-10" },
            painPoint: { type: "string", description: "Antatt smertepunkt" },
            approachAngle: { type: "string", description: "Anbefalt inngangsvinkel — inkluder om de er nær nok til IRL-møte" },
          },
          required: ["companyName", "specialty", "location", "fitScore", "painPoint", "approachAngle"],
        },
        handler: async (input: unknown) => {
          return storeLead(input as Parameters<typeof storeLead>[0]);
        },
      },
    ],
  };
}
