import { BaseAgent } from "./base";
import type { AgentDefinition, AgentInput, AgentContext, AgentOutput } from "./types";
import { anthropic, pickModel } from "@/lib/anthropic/client";

export class DevAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Dev",
    department: "engineering" as const,
    role: "developer",
    model: "sonnet",
    description:
      "Leser logger, oppdager feilmønstre, og foreslår fixes som pull requests.",
    schedule: "0 */4 * * *",
    systemPrompt: `Du er Dev, en analytisk og løsningsorientert utvikleragent for Agent Imperie.

Din jobb er å analysere logger og systemdata for å:
1. Oppdage feilmønstre og avvik
2. Prioritere problemer etter alvorlighetsgrad
3. Foreslå konkrete fixes med kodeeksempler
4. Identifisere ytelsesflaskehalser

Klassifiser funn slik:
- 🔴 KRITISK: Systemet er nede eller data går tapt
- 🟠 HØY: Funksjonalitet er degradert
- 🟡 MEDIUM: Ytelse eller brukeropplevelse påvirkes
- 🟢 LAV: Teknisk gjeld eller forbedringspotensial

For hvert funn: beskriv problemet, rotårsaken og anbefalt fix.
Skriv på norsk. Vær teknisk presis men forståelig.`,
    tools: [],
  };

  async run(input: AgentInput, ctx: AgentContext): Promise<AgentOutput> {
    await ctx.log("thought", {
      title: "Dev starter logganalyse",
      input: { timestamp: new Date().toISOString() },
    });

    const idag = new Date().toLocaleDateString("nb-NO", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    // I produksjon: hent faktiske logger fra Vercel, Sentry, Datadog etc.
    const mockLoggdata = input.data?.logger ?? `
[ERROR] 2026-05-01T06:12:33Z - api/inngest: Response timeout after 5000ms (3 occurrences)
[WARN]  2026-05-01T05:45:11Z - nova-prospektering: Rate limit approaching (85% of quota)
[ERROR] 2026-05-01T04:30:02Z - guardian-health-check: Fetch failed - ECONNREFUSED (1 occurrence)
[WARN]  2026-05-01T03:15:44Z - ledger-daily-brief: Anthropic API latency high (4200ms avg)
[INFO]  2026-05-01T02:30:52Z - hermes-skriver: Completed successfully (23s duration)
[WARN]  2026-05-01T01:00:00Z - next.js: Deprecated dependency serialize-error@0.1.4
    `.trim();

    const response = await anthropic.messages.create({
      model: pickModel(this.definition.model),
      max_tokens: 2048,
      system: this.definition.systemPrompt,
      messages: [
        {
          role: "user",
          content: `Analyser følgende logger fra ${idag}:

\`\`\`
${mockLoggdata}
\`\`\`

Gi en strukturert rapport med:
1. Sammendrag av funn
2. Prioritert liste over problemer med anbefalt fix
3. Forebyggende tiltak`,
        },
      ],
    });

    const rapport =
      response.content[0].type === "text" ? response.content[0].text : "";

    await ctx.log("output", {
      title: "Logganalyse ferdig",
      output: { rapport },
    });

    return {
      summary: rapport,
      artifacts: [
        {
          type: "report",
          title: `Dev-rapport · ${idag}`,
          content: rapport,
        },
      ],
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}
