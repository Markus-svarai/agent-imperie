import { BaseAgent } from "./base";
import type { AgentDefinition, AgentInput, AgentContext, AgentOutput } from "./types";
import { anthropic, pickModel } from "@/lib/anthropic/client";

export class ScribeAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Scribe",
    department: "analytics" as const,
    role: "analyst",
    model: "sonnet",
    description:
      "Analyserer samtaler ukentlig og finner mønstre — innvendinger, vinnertemaer, friksjon.",
    schedule: "0 9 * * 1",
    systemPrompt: `Du er Scribe, en skarp og innsiktsfull samtaleanalytiker for Agent Imperie.

Din jobb er å analysere salgssamtaler, kundehenvendelser og møtereferat for å finne:

1. **Gjentakende innvendinger** — hva stopper folk fra å kjøpe?
2. **Vinnertemaer** — hva resonerer og driver frem et ja?
3. **Friksjonspunkter** — hvor i prosessen mister vi folk?
4. **Kundespråk** — hvordan beskriver kundene problemet med egne ord?
5. **Muligheter** — hva etterspør kundene som vi ikke tilbyr?

Format: strukturert rapport med konkrete sitater og handlingsanbefalinger.
Skriv på norsk. Vær analytisk, konkret og handlingsorientert.`,
    tools: [],
  };

  async run(input: AgentInput, ctx: AgentContext): Promise<AgentOutput> {
    await ctx.log("thought", {
      title: "Scribe starter samtaleanalyse",
      input: { timestamp: new Date().toISOString() },
    });

    const idag = new Date().toLocaleDateString("nb-NO", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    // I produksjon: hent samtaler fra Gong, Slack, e-post etc.
    const mockSamtaler = input.data?.samtaler ?? `
Samtale 1 – Tannlege Oslo (Nei)
"Vi har prøvd lignende løsninger før og det fungerte ikke. Pasientene klaget på at de snakket med en robot."

Samtale 2 – Hudklinikk Bergen (Demo booket)
"Vi drukner i telefoner, spesielt om morgenen. Hvis dette faktisk fungerer er det verdt det. Hva koster det?"

Samtale 3 – Legesenter Stavanger (Nei)
"Vi er ikke klare for AI ennå. Vi vil heller ansette en resepsjonist til."

Samtale 4 – Fysioterapi Oslo (Ja)
"Vi mistet tre akuttpasienter forrige uke fordi ingen tok telefonen. Tre! Kom og vis oss dette."

Samtale 5 – Tannklinikk Trondheim (Tenker på det)
"Hva skjer hvis systemet feiler? Vi kan ikke risikere at pasientene ikke får time."

Samtale 6 – Hudklinikk Oslo (Demo booket)
"Resepsjonisten min sier hun bruker 60% av dagen på telefon. Det høres riktig ut. La oss se en demo."
    `.trim();

    const response = await anthropic.messages.create({
      model: pickModel(this.definition.model),
      max_tokens: 2048,
      system: this.definition.systemPrompt,
      messages: [
        {
          role: "user",
          content: `Analyser følgende samtaler fra siste uke (${idag}):

${mockSamtaler}

Lever en strukturert ukesrapport med mønstre, innsikter og anbefalinger.`,
        },
      ],
    });

    const analyse =
      response.content[0].type === "text" ? response.content[0].text : "";

    await ctx.log("output", {
      title: "Samtaleanalyse ferdig",
      output: { analyse },
    });

    return {
      summary: analyse,
      artifacts: [
        {
          type: "summary",
          title: `Scribe ukesrapport · ${idag}`,
          content: analyse,
        },
      ],
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}
