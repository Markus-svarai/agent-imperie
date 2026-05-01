import { inngest } from "../client";
import { makeCtx, dagsDato } from "../utils";
import { TitanAgent } from "@/lib/agents/sales";
import { PulseAgent } from "@/lib/agents/sales";
import { RexAgent } from "@/lib/agents/sales";

const titan = new TitanAgent();
const pulse = new PulseAgent();
const rex = new RexAgent();

// ─── Titan — daglig oppfølgingsplan (hverdager 08:00) ────────────────────

export const titanDagligOppfolging = inngest.createFunction(
  { id: "titan-daglig-oppfolging", name: "Titan · Daglig oppfølgingsplan", retries: 1 },
  { cron: "0 8 * * 1-5" },
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("titan");
    const output = await step.run("titan-planlegger", () =>
      titan.run(
        { message: `Det er ${dagsDato()}. Hvilke prospects bør Markus følge opp i dag? Lever konkret oppfølgingsplan.` },
        ctx
      )
    );
    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, plan: output.summary, usage: output.usage, logs };
  }
);

// Titan aktiveres når Hermes har sendt outreach
export const titanOppfolgingEtterHermes = inngest.createFunction(
  { id: "titan-etter-hermes", name: "Titan · Oppfølging etter outreach", retries: 1 },
  { event: "hermes/outreach.sent" },
  async ({ event, step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("titan");
    const output = await step.run("titan-planlegger-oppfolging", () =>
      titan.run(
        {
          message: `Hermes har sendt outreach til følgende prospects:\n\n${event.data.mottakere as string}\n\nLag en 7-dagers oppfølgingssekvens for disse.`,
        },
        ctx
      )
    );
    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, sekvens: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);

// ─── Pulse — daglig pipeline-hygiene (hverdager 17:00) ───────────────────

export const pulsePipelineHygiene = inngest.createFunction(
  { id: "pulse-pipeline-hygiene", name: "Pulse · Pipeline-hygiene", retries: 2 },
  { cron: "0 17 * * 1-5" },
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("pulse");
    const output = await step.run("pulse-rydder", () =>
      pulse.run(
        { message: `Dato: ${dagsDato()}. Gjennomfør daglig pipeline-hygiene. Identifiser stale leads og gi oppfølgingsanbefalinger.` },
        ctx
      )
    );
    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, rapport: output.summary, usage: output.usage, logs };
  }
);

// ─── Rex — ukentlig revenue-analyse (fredager 09:00) ─────────────────────

export const rexUkesanalyse = inngest.createFunction(
  { id: "rex-ukesanalyse", name: "Rex · Ukentlig revenue-analyse", retries: 2 },
  { cron: "0 9 * * 5" },
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("rex");
    const output = await step.run("rex-analyserer", () =>
      rex.run(
        { message: `Fredag ${dagsDato()}. Lever ukentlig revenue-analyse med pipeline-helse og ARR-prognose.` },
        ctx
      )
    );

    // Send til Ledger for ukesrapporten
    await step.run("publiser-revenue", async () => {
      await inngest.send({
        name: "rex/revenue.ready",
        data: { analyse: output.summary, dato: new Date().toISOString() },
      });
    });

    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, analyse: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);
