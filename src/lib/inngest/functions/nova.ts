import { inngest } from "../client";
import { NovaAgent } from "@/lib/agents/nova";
import type { AgentContext } from "@/lib/agents/types";

const nova = new NovaAgent();

export const novaProspektering = inngest.createFunction(
  {
    id: "nova-daglig-prospektering",
    name: "Nova · Daglig prospektering",
    retries: 2,
  },
  { cron: "0 7 * * 1-5" }, // Mandag-fredag kl 07:00
  async ({ step }) => {
    const runId = `nova-${Date.now()}`;
    const logs: unknown[] = [];

    const ctx: AgentContext = {
      orgId: "default",
      agentId: "nova",
      runId,
      log: async (type, payload) => {
        logs.push({ type, ...payload, ts: new Date().toISOString() });
        return runId;
      },
    };

    const output = await step.run("nova-prospektering", async () => {
      return nova.run({}, ctx);
    });

    // Trigger Hermes med leadlisten
    await step.run("trigger-hermes", async () => {
      await inngest.send({
        name: "nova/leads.ready",
        data: {
          leadliste: output.summary,
          runId,
          dato: new Date().toISOString(),
        },
      });
    });

    return {
      runId,
      leadliste: output.summary,
      artifacts: output.artifacts,
      usage: output.usage,
      logs,
    };
  }
);
