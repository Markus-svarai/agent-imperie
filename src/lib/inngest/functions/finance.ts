import { inngest } from "../client";
import { makeCtx, dagsDato } from "../utils";
import { MintAgent } from "@/lib/agents/finance";
import { VoltAgent } from "@/lib/agents/finance";

const mint = new MintAgent();
const volt = new VoltAgent();

// ─── Mint — nattlig kostnadsoptimalisering (23:00) ───────────���────────────

export const mintKostnadsrapport = inngest.createFunction(
  { id: "mint-kostnadsrapport", name: "Mint · Nattlig kostnadsrapport", retries: 2 },
  { cron: "0 23 * * *" },
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("mint");
    const output = await step.run("mint-analyserer-kostnader", () =>
      mint.run(
        { message: `Dato: ${dagsDato()}. Analyser dagens token-forbruk og lever kostnadsrapport med optimaliseringsforslag.` },
        ctx
      )
    );

    // Send til Ledger for morgenbriefet
    await step.run("send-til-ledger", async () => {
      await inngest.send({
        name: "mint/costs.ready",
        data: { rapport: output.summary, dato: new Date().toISOString() },
      });
    });

    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, rapport: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);

// ─── Volt — ukentlig vekstanalyse (fredager 09:00) ────────────────────────

export const voltVekstanalyse = inngest.createFunction(
  { id: "volt-vekstanalyse", name: "Volt · Ukentlig vekstanalyse", retries: 2 },
  { cron: "0 9 * * 5" },
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("volt");
    const output = await step.run("volt-analyserer-vekst", () =>
      volt.run(
        { message: `Fredag ${dagsDato()}. Lever ukentlig vekstanalyse: retention, ARR, CAC/LTV og churn-risiko.` },
        ctx
      )
    );

    // Send til Ledger og Rex
    await step.run("publiser-vekst", async () => {
      await inngest.send({
        name: "volt/growth.ready",
        data: { analyse: output.summary, dato: new Date().toISOString() },
      });
    });

    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, analyse: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);
