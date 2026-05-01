import { inngest } from "../client";
import { ScribeAgent } from "@/lib/agents/scribe";
import type { AgentContext } from "@/lib/agents/types";

const scribe = new ScribeAgent();

export const scribeUkesanalyse = inngest.createFunction(
  {
    id: "scribe-ukesanalyse",
    name: "Scribe · Ukesanalyse",
    retries: 2,
  },
  { cron: "0 9 * * 1" }, // Mandag kl 09:00
  async ({ step }) => {
    const runId = `scribe-${Date.now()}`;
    const logs: unknown[] = [];

    const ctx: AgentContext = {
      orgId: "default",
      agentId: "scribe",
      runId,
      log: async (type, payload) => {
        logs.push({ type, ...payload, ts: new Date().toISOString() });
        return runId;
      },
    };

    const output = await step.run("scribe-analyserer", async () => {
      return scribe.run({}, ctx);
    });

    return {
      runId,
      analyse: output.summary,
      artifacts: output.artifacts,
      usage: output.usage,
      logs,
    };
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
    const runId = `scribe-manuelt-${Date.now()}`;
    const logs: unknown[] = [];

    const ctx: AgentContext = {
      orgId: "default",
      agentId: "scribe",
      runId,
      log: async (type, payload) => {
        logs.push({ type, ...payload, ts: new Date().toISOString() });
        return runId;
      },
    };

    const output = await step.run("scribe-manuelt", async () => {
      return scribe.run(
        { data: { samtaler: event.data.samtaler as string } },
        ctx
      );
    });

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
