import { inngest } from "../client";
import { makeCtx } from "../utils";
import { NovaAgent } from "@/lib/agents/nova";
import { notifyMarkus } from "@/lib/tools/notify";

const nova = new NovaAgent();

export const novaProspektering = inngest.createFunction(
  {
    id: "nova-daglig-prospektering",
    name: "Nova · Daglig prospektering",
    retries: 2,
  },
  { cron: "0 7 * * 1-5" }, // Mandag-fredag kl 07:00
  async ({ step }) => {
    const { ctx, runId, logs, persistRun, isHalted } = makeCtx("nova");

    if (await step.run("sjekk-kill-switch", isHalted)) {
      return { skipped: true, reason: "system_disabled" };
    }

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

    // Varsle Markus om hva Nova fant
    await step.run("varsle-markus", () =>
      notifyMarkus({
        subject: `Nova er ferdig — nye leads funnet`,
        agentName: "Nova",
        agentColor: "#3b82f6",
        body: output.summary,
        runId,
        ctaLabel: "Se kjøringen",
        ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://agentimperie.vercel.app"}/runs`,
      })
    );

    return { runId, leadliste: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);
