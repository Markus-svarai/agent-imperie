import { inngest } from "../client";
import { DevAgent } from "@/lib/agents/dev";
import type { AgentContext } from "@/lib/agents/types";

const dev = new DevAgent();

export const devLogganalyse = inngest.createFunction(
  {
    id: "dev-logganalyse",
    name: "Dev · Logganalyse",
    retries: 2,
  },
  { cron: "0 */4 * * *" }, // Hver 4. time
  async ({ step }) => {
    const runId = `dev-${Date.now()}`;
    const logs: unknown[] = [];

    const ctx: AgentContext = {
      orgId: "default",
      agentId: "dev",
      runId,
      log: async (type, payload) => {
        logs.push({ type, ...payload, ts: new Date().toISOString() });
        return runId;
      },
    };

    const output = await step.run("dev-analyserer-logger", async () => {
      return dev.run({}, ctx);
    });

    // Varsle Jarvis hvis kritiske feil er funnet
    if (output.summary.includes("KRITISK")) {
      await step.run("varsle-jarvis", async () => {
        await inngest.send({
          name: "dev/kritisk-feil",
          data: {
            rapport: output.summary,
            runId,
            timestamp: new Date().toISOString(),
          },
        });
      });
    }

    return {
      runId,
      rapport: output.summary,
      artifacts: output.artifacts,
      usage: output.usage,
      logs,
    };
  }
);
