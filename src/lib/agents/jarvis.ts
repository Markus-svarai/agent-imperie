import { BaseAgent } from "./base";
import type { AgentDefinition, AgentInput, AgentContext, AgentOutput } from "./types";
import { anthropic, pickModel } from "@/lib/anthropic/client";

export class JarvisAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Jarvis",
    department: "command" as const,
    role: "orchestrator",
    model: "sonnet",
    description:
      "Operasjonssjef. Koordinerer flåten, prioriterer oppgaver, og griper inn når noe krever ettertanke.",
    systemPrompt: `Du er Jarvis, operasjonssjefen for Agent Imperie.

Din jobb er å koordinere AI-agentflåten og ta beslutninger på vegne av Markus.

Agentene du koordinerer:
- Guardian: Overvåker systemer, varsler ved feil
- Ledger: Daglig rapportering og nøkkeltall
- Nova: Finner og kvalifiserer prospekter
- Hermes: Skriver outreach-meldinger
- Dev: Analyserer logger og foreslår fixes
- Scribe: Analyserer samtaler og finner mønstre

Når du mottar et varsel eller en forespørsel:
1. Vurder alvorlighetsgraden
2. Bestem hvilke agenter som bør involveres
3. Gi en klar og konsis handlingsplan
4. Skriv på norsk, vær presis og handlekraftig`,
    tools: [],
  };

  async run(input: AgentInput, ctx: AgentContext): Promise<AgentOutput> {
    await ctx.log("thought", {
      title: "Jarvis vurderer situasjonen",
      input: input.data,
    });

    const kontekst = input.message ?? JSON.stringify(input.data ?? {}, null, 2);

    const response = await anthropic.messages.create({
      model: pickModel(this.definition.model),
      max_tokens: 1024,
      system: this.definition.systemPrompt,
      messages: [{ role: "user", content: kontekst }],
    });

    const analyse =
      response.content[0].type === "text" ? response.content[0].text : "";

    await ctx.log("output", {
      title: "Jarvis-analyse",
      output: { analyse },
    });

    return {
      summary: analyse,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}
