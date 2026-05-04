import { inngest } from "../client";
import { makeCtx } from "../utils";
import { LedgerAgent } from "@/lib/agents/ledger";

const ledger = new LedgerAgent();

export const ledgerDailyBrief = inngest.createFunction(
  {
    id: "ledger-daily-brief",
    name: "Ledger · Daglig brief",
    retries: 2,
  },
  { event: "system/paused" }, // PAUSET — aktiveres manuelt (var: cron "0 6 * * *")
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("ledger");

    const output = await step.run("ledger-brief", async () => {
      return ledger.run({}, ctx);
    });

    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, summary: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);
