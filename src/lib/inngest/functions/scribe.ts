import { inngest } from "../client";
import { makeCtx } from "../utils";
import { ScribeAgent } from "@/lib/agents/scribe";

const scribe = new ScribeAgent();

export const scribeUkesanalyse = inngest.createFunction(
  {
    id: "scribe-ukesanalyse",
    name: "Scribe · Ukesanalyse",
    retries: 2,
  },
  { cron: "0 9 * * 1" }, // Mandag kl 09:00
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("scribe");

    const output = await step.run("scribe-analyserer", async () => {
      return scribe.run({}, ctx);
    });

    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, analyse: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);

// Kan trigges manuelt med egne samtaledata
export const scribeManueltOppdrag = inngest.createFunction(
  {
    id: "scribe-manuelt",
    name: "Scribe · Manuell analyse",
    retries: 1,
  },
  { event: "scribe/analyser" },
  async ({ event, step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("scribe");

    const output = await step.run("scribe-manuelt", async () => {
      return scribe.run({ data: { samtaler: event.data.samtaler as string } }, ctx);
    });

    await step.run("lagre-kjøring", () => persistRun(output, "event"));

    return {
      runId,
      trigger: "manuelt",
      analyse: output.summary,
      artifacts: output.artifacts,
      usage: output.usage,
      logs,
    };
  }
);
