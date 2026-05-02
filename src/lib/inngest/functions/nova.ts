import { inngest } from "../client";
import { makeCtx } from "../utils";
import { NovaAgent } from "@/lib/agents/nova";

const nova = new NovaAgent();

export const novaProspektering = inngest.createFunction(
  {
    id: "nova-daglig-prospektering",
    name: "Nova · Daglig prospektering",
    retries: 2,
  },
  { cron: "0 7 * * 1-5" }, // Mandag-fredag kl 07:00
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("nova");

    const output = await step.run("nova-prospektering", async () => {
      return nova.run({}, ctx);
    });

    await step.run("lagre-kjøring", () => persistRun(output));

    // Trigger Hermes med leadlisten — send novaRunId for traceability
    await step.run("trigger-hermes", async () => {
      await inngest.send({
        name: "nova/leads.ready",
        data: { leadliste: output.summary, novaRunId: runId, dato: new Date().toISOString() },
      });
    });

    return { runId, leadliste: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);
