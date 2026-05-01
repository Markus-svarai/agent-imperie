import { inngest } from "../client";
import { makeCtx } from "../utils";
import { HermesAgent } from "@/lib/agents/hermes";

const hermes = new HermesAgent();

// Trigges automatisk av Nova
export const hermesSkrivMeldinger = inngest.createFunction(
  {
    id: "hermes-skriv-meldinger",
    name: "Hermes · Skriv outreach-meldinger",
    retries: 2,
  },
  { event: "nova/leads.ready" },
  async ({ event, step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("hermes");

    const output = await step.run("hermes-skriver", async () => {
      return hermes.run({ data: { leadliste: event.data.leadliste } }, ctx);
    });

    await step.run("lagre-kjøring", () => persistRun(output, "event"));

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
    const { ctx, runId, logs, persistRun } = makeCtx("hermes");

    const output = await step.run("hermes-manuelt", async () => {
      return hermes.run({ message: event.data.prospekter as string }, ctx);
    });

    await step.run("lagre-kjøring", () => persistRun(output, "manual"));

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
