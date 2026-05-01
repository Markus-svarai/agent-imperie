import { inngest } from "../client";
import { makeCtx } from "../utils";
import { ForgeAgent } from "@/lib/agents/engineering";
import { CipherAgent } from "@/lib/agents/engineering";
import { SentinelAgent } from "@/lib/agents/engineering";
import { PatchAgent } from "@/lib/agents/engineering";

const forge = new ForgeAgent();
const cipher = new CipherAgent();
const sentinel = new SentinelAgent();
const patch = new PatchAgent();

// ─── Forge — trigges av Darwin product brief ──────────────────────────────

export const forgeImplementerer = inngest.createFunction(
  { id: "forge-implementerer", name: "Forge · Implementerer feature", retries: 2 },
  { event: "darwin/brief.ready" },
  async ({ event, step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("forge");
    const spec = event.data.spec as string;

    const output = await step.run("forge-koder", () =>
      forge.run(
        { message: `Product brief fra Darwin:\n\n${spec}\n\nImplementer denne featuren. Husk: plan → kode → self-review.` },
        ctx
      )
    );

    // Send til Cipher for review
    await step.run("send-til-cipher", async () => {
      await inngest.send({
        name: "forge/code.ready",
        data: { kode: output.summary, forgeRunId: runId, spec },
      });
    });

    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, kode: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);

// Forge kan også motta direkte oppdrag
export const forgeManuelOppdrag = inngest.createFunction(
  { id: "forge-manuelt", name: "Forge · Manuelt oppdrag", retries: 1 },
  { event: "forge/kod" },
  async ({ event, step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("forge");
    const output = await step.run("forge-koder-manuelt", () =>
      forge.run({ message: event.data.oppdrag as string }, ctx)
    );
    await step.run("send-til-cipher", async () => {
      await inngest.send({
        name: "forge/code.ready",
        data: { kode: output.summary, forgeRunId: runId },
      });
    });
    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, kode: output.summary, usage: output.usage, logs };
  }
);

// ─── Cipher — trigges av Forge ────────────────────────────────────────────

export const cipherReviewer = inngest.createFunction(
  { id: "cipher-reviewer", name: "Cipher · Code Review", retries: 2 },
  { event: "forge/code.ready" },
  async ({ event, step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("cipher");
    const kode = event.data.kode as string;

    const output = await step.run("cipher-reviewerer", () =>
      cipher.run(
        { message: `Review denne koden fra Forge:\n\n${kode}\n\nLever din vurdering (GODKJENT / ENDRINGER KREVES / AVVIST).` },
        ctx
      )
    );

    const godkjent = output.summary.includes("✅ GODKJENT") || output.summary.toLowerCase().includes("godkjent");

    if (godkjent) {
      await step.run("send-til-sentinel", async () => {
        await inngest.send({
          name: "cipher/review.approved",
          data: { kode, review: output.summary, cipherRunId: runId },
        });
      });
    } else {
      // Send tilbake til Forge
      await step.run("send-tilbake-til-forge", async () => {
        await inngest.send({
          name: "cipher/review.rejected",
          data: { kode, feedback: output.summary, cipherRunId: runId },
        });
      });
    }

    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, review: output.summary, godkjent, usage: output.usage, logs };
  }
);

// ─── Sentinel — trigges av Cipher-godkjenning ────────────────────────────

export const sentinelQA = inngest.createFunction(
  { id: "sentinel-qa", name: "Sentinel · QA Testing", retries: 2 },
  { event: "cipher/review.approved" },
  async ({ event, step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("sentinel");
    const kode = event.data.kode as string;

    const output = await step.run("sentinel-tester", () =>
      sentinel.run(
        { message: `Cipher har godkjent denne koden. Skriv testcases og valider:\n\n${kode}` },
        ctx
      )
    );

    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, testrapport: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);

// ─── Patch — infrastrukturovervåking hvert 6. time ───────────────────────

export const patchInfraCheck = inngest.createFunction(
  { id: "patch-infra-check", name: "Patch · Infrastruktursjekk", retries: 2 },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("patch");
    const output = await step.run("patch-sjekker-infra", () =>
      patch.run(
        { message: "Lever infrastrukturrapport. Sjekk deployments, ytelse og eventuelle anomalier." },
        ctx
      )
    );
    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, rapport: output.summary, usage: output.usage, logs };
  }
);

// Patch reagerer på Vault sikkerhetsrapporter
export const patchReagerSikkerhet = inngest.createFunction(
  { id: "patch-reagerer-sikkerhet", name: "Patch · Reagerer på sikkerhetsrapport", retries: 1 },
  { event: "vault/security.critical" },
  async ({ event, step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("patch");
    const output = await step.run("patch-handler-sikkerhet", () =>
      patch.run(
        { message: `Vault har funnet kritiske sikkerhetsproblemer:\n\n${event.data.funn as string}\n\nLag en umiddelbar handlingsplan.` },
        ctx
      )
    );
    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, handlingsplan: output.summary, usage: output.usage, logs };
  }
);
