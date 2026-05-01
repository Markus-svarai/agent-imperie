import { inngest } from "../client";
import { makeCtx, dagsDato } from "../utils";
import { VaultAgent } from "@/lib/agents/operations";
import { FluxAgent } from "@/lib/agents/operations";
import { KronosAgent } from "@/lib/agents/operations";

const vault = new VaultAgent();
const flux = new FluxAgent();
const kronos = new KronosAgent();

// ─── Vault — nattlig sikkerhetssjekk (03:00) ─────────────────────────────

export const vaultSikkerhetssjekk = inngest.createFunction(
  { id: "vault-sikkerhetssjekk", name: "Vault · Nattlig sikkerhetssjekk", retries: 2 },
  { cron: "0 3 * * *" },
  async ({ step }) => {
    const { ctx, runId, logs } = makeCtx("vault");
    const output = await step.run("vault-scanner", () =>
      vault.run(
        { message: `Dato: ${dagsDato()}. Gjennomfør nattlig sikkerhetssjekk av Agent Imperie / SvarAI.` },
        ctx
      )
    );

    // Varsle Patch ved kritiske funn
    if (output.summary.includes("🔴 KRITISK")) {
      await step.run("varsle-patch-kritisk", async () => {
        await inngest.send({
          name: "vault/security.critical",
          data: { funn: output.summary, vaultRunId: runId },
        });
      });
    }

    return { runId, rapport: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);

// ─── Flux — trigges av deployments og endringer ───────────��───────────────

export const fluxLoggEndring = inngest.createFunction(
  { id: "flux-logg-endring", name: "Flux · Logger endring", retries: 1 },
  { event: "system/change.detected" },
  async ({ event, step }) => {
    const { ctx, runId, logs } = makeCtx("flux");
    const output = await step.run("flux-vurderer", () =>
      flux.run(
        {
          message: `Ny system-endring oppdaget:\n\n${JSON.stringify(event.data, null, 2)}\n\nLogg og vurder risiko. Lag rollback-plan hvis nødvendig.`,
        },
        ctx
      )
    );
    return { runId, vurdering: output.summary, usage: output.usage, logs };
  }
);

// Flux kan trigges manuelt for å logge en planlagt endring
export const fluxPlanleggEndring = inngest.createFunction(
  { id: "flux-planlegg-endring", name: "Flux · Planlegg endring", retries: 1 },
  { event: "flux/planlegg" },
  async ({ event, step }) => {
    const { ctx, runId, logs } = makeCtx("flux");
    const output = await step.run("flux-planlegger", () =>
      flux.run(
        { message: `Planlegg følgende endring og lag rollback-plan:\n\n${event.data.beskrivelse as string}` },
        ctx
      )
    );
    return { runId, plan: output.summary, usage: output.usage, logs };
  }
);

// ─── Kronos — ukentlig schedule-optimalisering (mandager 05:00) ──────────

export const kronosOptimaliser = inngest.createFunction(
  { id: "kronos-optimaliserer", name: "Kronos · Schedule-optimalisering", retries: 1 },
  { cron: "0 5 * * 1" },
  async ({ step }) => {
    const { ctx, runId, logs } = makeCtx("kronos");
    const output = await step.run("kronos-analyserer", () =>
      kronos.run(
        { message: `Mandag ${dagsDato()}. Analyser agentflåtens schedule for konflikter og optimaliseringsmuligheter.` },
        ctx
      )
    );
    return { runId, analyse: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);
