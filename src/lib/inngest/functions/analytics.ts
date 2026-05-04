import { inngest } from "../client";
import { makeCtx, dagsDato } from "../utils";
import { searchMany } from "@/lib/tools/search";
import { LensAgent } from "@/lib/agents/analytics";
import { SageAgent } from "@/lib/agents/analytics";
import { QuillAgent } from "@/lib/agents/analytics";

const lens = new LensAgent();
const sage = new SageAgent();
const quill = new QuillAgent();

// ─── Lens — daglig KPI-overvåking (08:00) ────────────────────────────────

export const lensDagligKpis = inngest.createFunction(
  { id: "lens-daglig-kpis", name: "Lens · Daglig KPI-overvåking", retries: 2 },
  { event: "system/paused" }, // PAUSET — aktiveres manuelt (var: cron "0 8 * * *")
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("lens");
    const output = await step.run("lens-analyserer", () =>
      lens.run(
        { message: `Dato: ${dagsDato()}. Lever daglig KPI-rapport. Sjekk for anomalier og flag eventuelle avvik.` },
        ctx
      )
    );

    // Varsle Jarvis ved kritiske anomalier
    if (output.summary.toLowerCase().includes("anomali") || output.summary.includes("⚠️")) {
      await step.run("varsle-jarvis-anomali", async () => {
        await inngest.send({
          name: "lens/anomaly.detected",
          data: { rapport: output.summary, lensRunId: runId },
        });
      });
    }

    // Publiser for Quill
    await step.run("publiser-for-quill", async () => {
      await inngest.send({
        name: "lens/kpis.ready",
        data: { rapport: output.summary, dato: new Date().toISOString() },
      });
    });

    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, rapport: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);

// ─── Sage — ukentlig markedsintelligens (mandager 07:00) ─────────────────

export const sageUkesrapport = inngest.createFunction(
  { id: "sage-ukesrapport", name: "Sage · Ukentlig markedsrapport", retries: 2 },
  { event: "system/paused" }, // PAUSET — aktiveres manuelt (var: cron "0 7 * * 1")
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("sage");

    // Hent markedsdata fra nettet
    const data = await step.run("hent-markedsdata", () =>
      searchMany({
        konkurrenter: "AI resepsjonist klinikk konkurrenter produkter priser",
        trender: "AI healthcare booking automation trends Norway Nordic",
        investering: "AI medical startup funding Series A 2025",
        regulering: "AI helsevesen regulering GDPR Norge 2025",
      }, { days: 7 })
    );

    const output = await step.run("sage-analyserer", () =>
      sage.run(
        {
          message: `Mandag ${dagsDato()}. Lever ukentlig markedsrapport for SvarAI.

MARKEDSDATA FRA SISTE UKE:

Konkurrenter og produktnyheter:
${data.konkurrenter}

Bransjetrender:
${data.trender}

Investeringer og exit:
${data.investering}

Regulering og compliance:
${data.regulering}

Syntetiser dette til én strukturert ukesrapport: konkurransebilde, muligheter, trusler, og én klar strategisk anbefaling til SvarAI-teamet.`,
        },
        ctx
      )
    );

    // Publiser for Athena og Quill
    await step.run("publiser-markedsrapport", async () => {
      await inngest.send({
        name: "sage/market.ready",
        data: { rapport: output.summary, dato: new Date().toISOString() },
      });
    });

    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, rapport: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);

// ─── Quill — daglig syntese (17:00) ──────────────────────────────────────

export const quillDagligSyntese = inngest.createFunction(
  { id: "quill-daglig-syntese", name: "Quill · Daglig executive summary", retries: 2 },
  { event: "system/paused" }, // PAUSET — aktiveres manuelt (var: cron "0 17 * * *")
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("quill");
    const output = await step.run("quill-syntetiserer", () =>
      quill.run(
        { message: `Det er ${dagsDato()} kl. 17:00. Syntetiser dagens analytiker-output til ett executive summary for Ledger og Jarvis.` },
        ctx
      )
    );

    // Send til Ledger
    await step.run("send-til-ledger", async () => {
      await inngest.send({
        name: "quill/summary.ready",
        data: { sammendrag: output.summary, dato: new Date().toISOString() },
      });
    });

    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, sammendrag: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);
