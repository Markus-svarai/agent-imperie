import { BaseAgent } from "./base";
import type { AgentDefinition } from "./types";
import { searchClinics, storeLead, getPipelineStats } from "@/lib/tools/find-clinics";
import { getMemory, setMemory, appendMemory, getAllMemory } from "@/lib/tools/memory";

export class NovaAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Nova",
    department: "sales" as const,
    role: "researcher",
    model: "sonnet",
    description:
      "Prospekteringsagent. Finner norske klinikker, kvalifiserer dem, lagrer dem — og lærer av hva som fungerer og ikke.",
    schedule: "0 7 * * 1-5",
    systemPrompt: `Du er Nova, prospekteringsagent for SvarAI.

## ALLTID START HER — to obligatoriske steg
1. Kall get_pipeline_stats — vis nåværende pipeline-status øverst
2. Kall get_all_memory — les hva du har lært fra tidligere kjøringer

## Vår situasjon akkurat nå
SvarAI er i tidlig pilotfase. Målet er 2-3 pilotklinikker — gratis for dem.
Bruk hukommelsen din aktivt: unngå mønstre som ikke har fungert, prioriter det som gir respons.

## ICP (Ideal Customer Profile)

**Beste klinikktyper:**
- Fysioterapi — behandler pasienter hele dagen, mister samtaler mellom behandlinger
- Psykolog / psykiatrisk klinikk — solopraktiker, sensitiv booking, ingen resepsjonist
- Hudklinikk / estetisk klinikk — høy no-show rate, dyr tid, trenger påminnelser
- Kiropraktor / osteopat / naprapat — høy telefontrafikk, travle behandlere
- Tverrfaglige klinikker — mange behandlere, kompleks bookingflyt

**Ikke prioriter:** Tannklinikker (har egne booking-systemer), sykehus, kommunale legekontorer

**Geografi — prioritert:**
1. Follo (Vestby, Ski, Drøbak, Vinterbro, Son, Ås, Kolbotn) — hjemsted, nær nok for IRL-møte
2. Moss og nærområde (Råde, Rygge) — nær nok for IRL-møte
3. Østfold ellers (Fredrikstad, Sarpsborg, Halden)
4. Oslo og omegn
5. Resten av Norge

**Størrelse:** 1-10 behandlere

## Slik jobber du
1. get_pipeline_stats → get_all_memory → les hva som har fungert og ikke
2. Søk etter klinikker med search_clinics (start Moss/Østfold)
3. Analyser: fit-score, smertepunkt, inngangsvinkel
4. Lagre med store_lead (fit-score ≥ 6)
5. **Etter kjøringen: kall set_memory med det du har lært**
   - Hvilke klinikktyper i hvilke byer ga best leads?
   - Hva er de vanligste smertepunktene du ser?
   - Hvilke søkestrategier fungerte best?

Skriv på norsk. Vær konkret. Lær og forbedre deg mellom kjøringer.`,
    tools: [
      {
        name: "get_pipeline_stats",
        description: "Hent nåværende pipeline-status — kall dette først",
        inputSchema: { type: "object", properties: {} },
        handler: async () => getPipelineStats(),
      },
      {
        name: "get_all_memory",
        description: "Les alt Nova har lært fra tidligere kjøringer",
        inputSchema: { type: "object", properties: {} },
        handler: async () => getAllMemory("nova"),
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
            companyName: { type: "string" },
            specialty: { type: "string" },
            location: { type: "string" },
            website: { type: "string" },
            email: { type: "string" },
            fitScore: { type: "number", description: "1-10" },
            painPoint: { type: "string" },
            approachAngle: { type: "string", description: "Inkluder om de er nær nok for IRL-møte" },
          },
          required: ["companyName", "specialty", "location", "fitScore", "painPoint", "approachAngle"],
        },
        handler: async (input: unknown) => storeLead(input as Parameters<typeof storeLead>[0]),
      },
      {
        name: "set_memory",
        description: "Lagre en lærdom for fremtidige kjøringer",
        inputSchema: {
          type: "object",
          properties: {
            key: { type: "string", description: "f.eks. 'best_specialties', 'location_heatmap', 'search_learnings'" },
            value: { description: "Verdien — kan være streng, tall, objekt eller liste" },
          },
          required: ["key", "value"],
        },
        handler: async (input: unknown) => {
          const { key, value } = input as { key: string; value: unknown };
          await setMemory("nova", key, value);
          return { ok: true };
        },
      },
      {
        name: "append_memory",
        description: "Legg til ett element i en memory-liste (f.eks. logg ett avvisnings-mønster)",
        inputSchema: {
          type: "object",
          properties: {
            key: { type: "string", description: "f.eks. 'rejection_patterns', 'icp_learnings'" },
            item: { description: "Elementet som skal legges til" },
          },
          required: ["key", "item"],
        },
        handler: async (input: unknown) => {
          const { key, item } = input as { key: string; item: unknown };
          await appendMemory("nova", key, item);
          return { ok: true };
        },
      },
    ],
  };
}
