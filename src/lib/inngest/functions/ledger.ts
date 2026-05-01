import { inngest } from "../client";
import { LedgerAgent } from "@/lib/agents/ledger";
import type { AgentContext } from "@/lib/agents/types";

const ledger = new LedgerAgent();

export const ledgerDailyBrief = inngest.createFunction(
  {
    id: "ledger-daily-brief",
    name: "Ledger · Daglig brief",
    retries: 2,
  },
  { cron: "0 6 * * *" },
  async ({ step }) => {
    const runId = `ledger-${Date.now()}`;
    const logs: unknown[] = [];

    const ctx: AgentContext = {
      orgId: "default",
      agentId: "ledger",
      runId,
      log: async (type, payload) => {
        logs.push({ type, ...payload, ts: new Date().toISOString() });
        return runId;
      },
    };

    const output = await step.run("ledger-brief", async () => {
      return ledger.run({}, ctx);
    });

    return {
      runId,
      summary: output.summary,
      artifacts: output.artifacts,
      usage: output.usage,
      logs,
    };
  }
);
