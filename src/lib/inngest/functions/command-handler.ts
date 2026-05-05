/**
 * Generisk agent-kommando via Inngest.
 * Brukes av /api/command for å unngå Vercel-timeout på lange agenter.
 * Inngest kjører step-for-step, ingen 60s grense.
 */

import { inngest } from "../client";
import { makeCtx } from "../utils";
import { REGISTRY } from "@/lib/agents/registry";
import { notifyMarkus } from "@/lib/tools/notify";

export const agentManualCommand = inngest.createFunction(
  {
    id: "agent-manual-command",
    name: "Agent · Manuelt kommando",
    retries: 1,
  },
  { event: "agent/command" },
  async ({ event, step }) => {
    const { agentId, message, runId: clientRunId } = event.data as {
      agentId: string;
      message: string;
      runId: string;
    };

    const agent = REGISTRY[agentId];
    if (!agent) throw new Error(`Ukjent agent: ${agentId}`);

    const { ctx, runId, logs, persistRun, persistError } = makeCtx(agentId);

    const output = await step.run("kjør-agent", async () => {
      try {
        return await agent.run({ message }, ctx);
      } catch (err) {
        await persistError(err, "manual");
        throw err;
      }
    });

    await step.run("lagre-kjøring", () => persistRun(output, "manual"));

    // Varsle Markus om manuell kjøring
    await step.run("varsle-markus", () =>
      notifyMarkus({
        subject: `${agentId} fullførte manuelt kommando`,
        agentName: agentId.charAt(0).toUpperCase() + agentId.slice(1),
        agentColor: "#6366f1",
        body: output.summary,
        runId,
        ctaLabel: "Se kjøringen",
        ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://agent-imperie.vercel.app"}/runs`,
      })
    );

    return {
      runId,
      clientRunId,
      agentId,
      summary: output.summary,
      usage: output.usage,
      logs,
    };
  }
);
