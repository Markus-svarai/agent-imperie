import { inngest } from "../client";
import { makeCtx } from "../utils";
import { DevAgent } from "@/lib/agents/dev";

const dev = new DevAgent();

export const devLogganalyse = inngest.createFunction(
  {
    id: "dev-logganalyse",
    name: "Dev · Logganalyse",
    retries: 2,
  },
  { event: "system/paused" }, // PAUSET — aktiveres manuelt (var: cron "0 9 * * 1")
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("dev");

    const output = await step.run("dev-analyserer-logger", async () => {
      return dev.run({}, ctx);
    });

    await step.run("lagre-kjøring", () => persistRun(output));

    // Varsle Jarvis hvis kritiske feil er funnet
    if (output.summary.includes("KRITISK")) {
      await step.run("varsle-jarvis", async () => {
        await inngest.send({
          name: "dev/kritisk-feil",
          data: { rapport: output.summary, runId, timestamp: new Date().toISOString() },
        });
      });
    }

    return { runId, rapport: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);
