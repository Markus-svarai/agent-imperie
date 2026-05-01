import { BaseAgent } from "./base";
import type { AgentDefinition, AgentInput, AgentContext, AgentOutput } from "./types";
import { anthropic, pickModel } from "@/lib/anthropic/client";

export class NovaAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Nova",
    department: "sales" as const,
    role: "researcher",
    model: "sonnet",
    description:
      "Finner og kvalifiserer nye prospekter daglig basert på din ICP. Output: kuratert leadliste.",
    schedule: "0 7 * * *",
    systemPrompt: `Du er Nova, en skarp og analytisk prospekteringsagent for Agent Imperie.

Din jobb er å finne og kvalifisere potensielle kunder basert på ICPen (Ideal Customer Profile):
- Klinikktype: tannlege, lege, hudklinikk, fysioterapi
- Geografi: Norge
- Størrelse: 1-20 ansatte
- Smertepunkt: Mister pasienter pga dårlig telefonhåndtering, mangler resepsjonist, høy no-show rate

For hvert prospekt skal du vurdere:
1. Fit-score (1-10) basert på ICP
2. Sannsynlig smertepunkt
3. Anbefalt inngangsvinkel for outreach

Skriv på norsk. Vær konkret og analytisk.`,
    tools: [],
  };

  async run(input: AgentInput, ctx: AgentContext): Promise<AgentOutput> {
    await ctx.log("thought", {
      title: "Nova starter prospektering",
      input: { dato: new Date().toISOString() },
    });

    const idag = new Date().toLocaleDateString("nb-NO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // I produksjon: hent data fra web-scraping, Apollo, LinkedIn etc.
    // Nå: generer realistiske eksempelprospekter med Claude
    const response = await anthropic.messages.create({
      model: pickModel(this.definition.model),
      max_tokens: 2048,
      system: this.definition.systemPrompt,
      messages: [
        {
          role: "user",
          content: `Dato: ${idag}

Generer en liste med 5 kvalifiserte prospekter for SvarAI (AI-resepsjonist for klinikker i Norge).

For hvert prospekt inkluder:
- Navn på klinikk og by
- Klinikktype
- Fit-score (1-10)
- Antatt smertepunkt
- Anbefalt inngangsvinkel

${input.data?.tilleggsinstruksjoner ?? ""}`,
        },
      ],
    });

    const leadliste =
      response.content[0].type === "text" ? response.content[0].text : "";

    await ctx.log("output", {
      title: "Leadliste generert",
      output: { antall: 5 },
    });

    return {
      summary: leadliste,
      artifacts: [
        {
          type: "prospect_list",
          title: `Leadliste · ${idag}`,
          content: leadliste,
        },
      ],
      events: [
        {
          type: "agent.completed",
          targetAgentId: "hermes",
          payload: { leadliste, dato: idag },
        },
      ],
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}
