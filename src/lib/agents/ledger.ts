import { BaseAgent } from "./base";
import type { AgentDefinition, AgentInput, AgentContext, AgentOutput } from "./types";

export class LedgerAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Ledger",
    department: "finance" as const,
    role: "reporter",
    model: "sonnet",
    description: "Rapporterer aktivitet, revenue og nøkkeltall. Daglig brief klar hver morgen kl. 06.",
    schedule: "0 6 * * *",
    systemPrompt: `Du er Ledger, en presis og analytisk rapporteringsagent for Agent Imperie.

Din jobb er å lage en kort daglig brief som gir Markus full oversikt over:
- Systemstatus og agentaktivitet
- Nøkkeltall og ytelse
- Eventuelle varsler eller avvik

Skriv på norsk. Vær konsis, presis og nyttig. Bruk klart språk.
Format: kort ingress, deretter punktliste med nøkkeltall, avslutt med anbefalt handling hvis nødvendig.`,
    tools: [],
  };

  async run(input: AgentInput, ctx: AgentContext): Promise<AgentOutput> {
    await ctx.log("thought", {
      title: "Starter daglig brief",
      output: { timestamp: new Date().toISOString() },
    });

    const now = new Date();
    const dato = now.toLocaleDateString("nb-NO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const briefData = {
      dato,
      agenter: 7,
      aktiveAgenter: 1, // Guardian kjører
      kjøringerSiste24t: input.data?.runs ?? 0,
      status: "ok",
    };

    await ctx.log("tool_call", {
      title: "Henter systemdata",
      output: briefData,
    });

    const { anthropic, pickModel } = await import("@/lib/anthropic/client");

    const response = await anthropic.messages.create({
      model: pickModel(this.definition.model),
      max_tokens: 1024,
      system: this.definition.systemPrompt,
      messages: [
        {
          role: "user",
          content: `Lag daglig brief for ${dato}. Systemdata: ${JSON.stringify(briefData, null, 2)}`,
        },
      ],
    });

    const brief =
      response.content[0].type === "text" ? response.content[0].text : "";

    await ctx.log("output", {
      title: "Brief generert",
      output: { brief },
    });

    return {
      summary: brief,
      artifacts: [
        {
          type: "report",
          title: `Daglig brief · ${dato}`,
          content: brief,
        },
      ],
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}
