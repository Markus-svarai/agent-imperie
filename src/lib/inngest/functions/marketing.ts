import { inngest } from "../client";
import { makeCtx, dagsDato } from "../utils";
import { MuseAgent } from "@/lib/agents/marketing";
import { BeaconAgent } from "@/lib/agents/marketing";
import { PrismAgent } from "@/lib/agents/marketing";
import { EchoAgent } from "@/lib/agents/marketing";

const muse = new MuseAgent();
const beacon = new BeaconAgent();
const prism = new PrismAgent();
const echo = new EchoAgent();

// ─── Beacon — ukentlig SEO-analyse (mandager 06:00) ──────────────────────

export const beaconSeoAnalyse = inngest.createFunction(
  { id: "beacon-seo-analyse", name: "Beacon · Ukentlig SEO-analyse", retries: 2 },
  { cron: "0 6 * * 1" },
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("beacon");
    const output = await step.run("beacon-analyserer", () =>
      beacon.run(
        { message: `Mandag ${dagsDato()}. Lever ukentlig SEO-analyse og gi Muse 3 konkrete blogg-temaer.` },
        ctx
      )
    );

    // Gi Muse input for uka
    await step.run("brief-muse", async () => {
      await inngest.send({
        name: "beacon/seo.ready",
        data: { anbefalinger: output.summary, dato: new Date().toISOString() },
      });
    });

    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, analyse: output.summary, usage: output.usage, logs };
  }
);

// ─── Muse — innholdsproduksjon (tirsdag + torsdag 09:00) ─────────────────

export const museSkriverInnhold = inngest.createFunction(
  { id: "muse-skriver-innhold", name: "Muse · Innholdsproduksjon", retries: 2 },
  { cron: "0 9 * * 2,4" },
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("muse");
    const output = await step.run("muse-skriver", () =>
      muse.run(
        { message: `Det er ${dagsDato()}. Skriv ett stykke innhold for SvarAI — blogginnlegg, LinkedIn-artikkel eller case study. Velg det mest verdifulle for vekst akkurat nå.` },
        ctx
      )
    );

    // Send til Prism for brand review
    await step.run("send-til-prism", async () => {
      await inngest.send({
        name: "muse/content.ready",
        data: { innhold: output.summary, museRunId: runId },
      });
    });

    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, innhold: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);

// Muse aktiveres også av Beacon med spesifikke SEO-temaer
export const museReagerPaaBeacon = inngest.createFunction(
  { id: "muse-beacon-triggered", name: "Muse · SEO-drevet innhold", retries: 1 },
  { event: "beacon/seo.ready" },
  async ({ event, step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("muse");
    const output = await step.run("muse-skriver-seo", () =>
      muse.run(
        { message: `Beacon anbefaler disse SEO-temaene:\n\n${event.data.anbefalinger as string}\n\nVelg det beste temaet og skriv innhold optimalisert for det.` },
        ctx
      )
    );
    await step.run("send-til-prism", async () => {
      await inngest.send({
        name: "muse/content.ready",
        data: { innhold: output.summary, museRunId: runId, kilde: "beacon" },
      });
    });
    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, innhold: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);

// ─── Prism — brand review (trigges av Muse) ───────────────────────────────

export const prismReviewer = inngest.createFunction(
  { id: "prism-reviewer", name: "Prism · Brand review", retries: 1 },
  { event: "muse/content.ready" },
  async ({ event, step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("prism");
    const innhold = event.data.innhold as string;

    const output = await step.run("prism-reviewerer", () =>
      prism.run(
        { message: `Review dette innholdet fra Muse for brand-samsvar:\n\n${innhold}` },
        ctx
      )
    );

    const godkjent = output.summary.includes("✅ Godkjent") || output.summary.toLowerCase().includes("godkjent");

    if (godkjent) {
      await step.run("send-til-echo", async () => {
        await inngest.send({
          name: "prism/content.approved",
          data: { innhold, review: output.summary, prismRunId: runId },
        });
      });
    }

    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, review: output.summary, godkjent, usage: output.usage, logs };
  }
);

// Prism reviewer også Hermes-outreach
export const prismReviewerOutreach = inngest.createFunction(
  { id: "prism-outreach-review", name: "Prism · Outreach brand review", retries: 1 },
  { event: "hermes/outreach.ready" },
  async ({ event, step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("prism");
    const output = await step.run("prism-reviewerer-outreach", () =>
      prism.run(
        { message: `Review denne outreach-meldingen fra Hermes:\n\n${event.data.melding as string}` },
        ctx
      )
    );
    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, review: output.summary, usage: output.usage, logs };
  }
);

// ─── Echo — distribusjon (trigges av Prism-godkjenning) ──────────────────

export const echoDistribuerer = inngest.createFunction(
  { id: "echo-distribuerer", name: "Echo · Distribuerer innhold", retries: 2 },
  { event: "prism/content.approved" },
  async ({ event, step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("echo");
    const innhold = event.data.innhold as string;

    const output = await step.run("echo-tilpasser", () =>
      echo.run(
        { message: `Prism har godkjent dette innholdet. Tilpass det for LinkedIn, Twitter/X og nyhetsbrev:\n\n${innhold}` },
        ctx
      )
    );

    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, distribuert: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);
