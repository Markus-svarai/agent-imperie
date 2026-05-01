import { inngest } from "../client";
import { HermesAgent } from "@/lib/agents/hermes";
import type { AgentContext } from "@/lib/agents/types";

const hermes = new HermesAgent();

function lagKontekst(runId: string) {
  const logs: unknown[] = [];
  const ctx: AgentContext = {
    orgId: "default",
    agentId: "hermes",
    runId,
    log: async (type, payload) => {
      logs.push({ type, ...payload, ts: new Date().toISOString() });
      return runId;
    },
  };
  return { ctx, logs };
}

// Trigges automatisk av Nova
export const hermesSkrivMeldinger = inngest.createFunction(
  {
    id: "hermes-skriv-meldinger",
    name: "Hermes · Skriv outreach-meldinger",
    retries: 2,
  },
  { event: "nova/leads.ready" },
  async ({ event, step }) => {
    const runId = `hermes-${Date.now()}`;
    const { ctx, logs } = lagKontekst(runId);

    const output = await step.run("hermes-skriver", async () => {
      return hermes.run(
        { data: { leadliste: event.data.leadliste } },
        ctx
      );
    });

    return {
      runId,
      trigger: "nova/leads.ready",
      meldinger: output.summary,
      artifacts: output.artifacts,
      usage: output.usage,
      logs,
    };
  }
);

// Kan også kjøres manuelt med egne prospekter
export const hermesManuelOpdrag = inngest.createFunction(
  {
    id: "hermes-manuelt-oppdrag",
    name: "Hermes · Manuelt oppdrag",
    retries: 1,
  },
  { event: "hermes/skriv" },
  async ({ event, step }) => {
    const runId = `hermes-manuelt-${Date.now()}`;
    const { ctx, logs } = lagKontekst(runId);

    const output = await step.run("hermes-manuelt", async () => {
      return hermes.run(
        { message: event.data.prospekter as string },
        ctx
      );
    });

    return {
      runId,
      trigger: "manuelt",
      meldinger: output.summary,
      artifacts: output.artifacts,
      usage: output.usage,
      logs,
    };
  }
);
