import { BaseAgent } from "./base";
import type { AgentDefinition } from "./types";
import { searchClinics, storeLead } from "@/lib/tools/find-clinics";

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

Din jobb er å finne og kvalifisere klinikker i Norge som kan ha nytte av SvarAI (AI-resepsjonist).

ICP (Ideal Customer Profile):
- Klinikktype: tannlege, lege, hudklinikk, fysioterapi, psykolog
- Geografi: start alltid med Moss og Østfold (Moss, Fredrikstad, Sarpsborg, Halden, Råde, Rygge), deretter Oslo og resten av Norge
- Størrelse: 1-20 ansatte
- Smertepunkt: mangler resepsjonist, mister pasienter, høy no-show rate

Når du kaller search_clinics-verktøyet, analyser resultatene og:
1. Identifiser spesifikke klinikker med navn og nettside
2. Vurder fit-score (1-10) basert på ICP
3. Identifiser sannsynlig smertepunkt
4. Beskriv best mulig inngangsvinkel for Hermes sin outreach
5. Kall store_lead for hvert kvalifisert prospekt (fit-score ≥ 6)

Skriv på norsk. Vær konkret — ekte klinikknavn, ekte byer, ekte smertepunkter.`,
    tools: [
      {
        name: "search_clinics",
        description: "Søk etter klinikker av en bestemt type i et norsk tettsted",
        inputSchema: {
          type: "object",
          properties: {
            specialty: {
              type: "string",
              description: "Klinikktype: tannlege, lege, hudklinikk, fysioterapi, psykolog",
            },
            location: {
              type: "string",
              description: "By eller område i Norge, f.eks. Oslo, Bergen, Trondheim",
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
            approachAngle: { type: "string", description: "Anbefalt inngangsvinkel for outreach" },
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
