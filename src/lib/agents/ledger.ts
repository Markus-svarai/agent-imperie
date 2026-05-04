import { BaseAgent } from "./base";
import type { AgentDefinition, AgentInput, AgentContext, AgentOutput } from "./types";
import { db, schema } from "@/lib/db";
import { eq, and, gte, count, sum } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";

export class LedgerAgent extends BaseAgent {
  definition: AgentDefinition = {
    name: "Ledger",
    department: "finance" as const,
    role: "reporter",
    model: "haiku", // DB-summering og rapportering — haiku er tilstrekkelig
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

    // Hent ekte systemdata fra databasen
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [agentRows, runRows, costRows] = await Promise.all([
      db.query.agents.findMany({
        where: eq(schema.agents.orgId, DEFAULT_ORG_ID),
        columns: { id: true, status: true, name: true },
      }),
      db.select({ total: count() })
        .from(schema.agentRuns)
        .where(and(
          eq(schema.agentRuns.orgId, DEFAULT_ORG_ID),
          gte(schema.agentRuns.startedAt, since24h)
        )),
      db.select({ totalCost: sum(schema.agentRuns.costMicroUsd) })
        .from(schema.agentRuns)
        .where(and(
          eq(schema.agentRuns.orgId, DEFAULT_ORG_ID),
          gte(schema.agentRuns.startedAt, since24h)
        )),
    ]);

    const aktiveAgenter = agentRows.filter(a => a.status === "active").length;
    const kjøringerSiste24t = runRows[0]?.total ?? 0;
    const kostnadSiste24tUsd = ((Number(costRows[0]?.totalCost ?? 0)) / 1_000_000).toFixed(4);

    const briefData = {
      dato,
      agenter: agentRows.length,
      aktiveAgenter,
      kjøringerSiste24t,
      kostnadSiste24tUsd,
      status: "ok",
    };

    await ctx.log("tool_call", {
      title: "Henter systemdata fra DB",
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
          content: `Lag daglig brief for ${dato}. Ekte systemdata fra databasen: ${JSON.stringify(briefData, null, 2)}

Inkluder kostnad (${kostnadSiste24tUsd} USD siste 24t) i rapporten.`,
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
