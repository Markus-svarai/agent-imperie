import { BaseAgent } from "./base";
import type { AgentDefinition, AgentInput, AgentContext, AgentOutput } from "./types";
import { anthropic, pickModel } from "@/lib/anthropic/client";

export class HermesAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Hermes",
    department: "sales" as const,
    role: "outreach",
    model: "sonnet",
    description:
      "Skriver personlige outreach-meldinger basert på Nova sin research. Hver melding er unik.",
    systemPrompt: `Du er Hermes, en presis og overbevisende outreach-agent for Agent Imperie.

Din jobb er å skrive personlige, profesjonelle outreach-meldinger til klinikker i Norge på vegne av SvarAI.

SvarAI er en AI-resepsjonist som:
- Svarer telefonen 24/7
- Booker timer automatisk
- Reduserer no-show med påminnelser
- Frigjør tid for klinikken

Regler for outreach:
- Maks 4-5 setninger per melding
- Alltid personalisert til klinikkens spesifikke situasjon
- Aldri generisk eller salesy
- Start med noe spesifikt om klinikken
- Avslutt med én konkret CTA (book demo, svar ja/nei)
- Skriv på norsk, profesjonell men varm tone`,
    tools: [],
  };

  async run(input: AgentInput, ctx: AgentContext): Promise<AgentOutput> {
    await ctx.log("thought", {
      title: "Hermes starter skriving",
      input: { antallProspekter: input.data?.leadliste ? "fra Nova" : "manuell input" },
    });

    const leadliste = input.data?.leadliste as string ?? input.message ?? "Ingen leadliste mottatt";

    const response = await anthropic.messages.create({
      model: pickModel(this.definition.model),
      max_tokens: 2048,
      system: this.definition.systemPrompt,
      messages: [
        {
          role: "user",
          content: `Her er leadlisten fra Nova:

${leadliste}

Skriv én personlig outreach-melding per prospekt.
Format for hver melding:
---
**[Klinikkname]**
[Meldingstekst]
---`,
        },
      ],
    });

    const meldinger =
      response.content[0].type === "text" ? response.content[0].text : "";

    await ctx.log("output", {
      title: "Outreach-meldinger skrevet",
      output: { meldinger },
    });

    const idag = new Date().toLocaleDateString("nb-NO", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    return {
      summary: meldinger,
      artifacts: [
        {
          type: "outreach_message",
          title: `Outreach-meldinger · ${idag}`,
          content: meldinger,
        },
      ],
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}
