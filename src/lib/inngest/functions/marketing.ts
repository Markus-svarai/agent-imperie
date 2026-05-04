import { inngest } from "../client";
import { makeCtx, dagsDato, safePayload } from "../utils";
import { searchMany } from "@/lib/tools/search";
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

    // Hent ekte søkedata og konkurrentanalyse
    const data = await step.run("hent-seo-data", () =>
      searchMany({
        keywords: "AI resepsjonist tannlege lege klinikk søkeord norsk",
        konkurrenter: "SvarAI konkurrenter AI booking klinikk nettside blogg",
        trender: "healthcare content marketing SEO trends 2025",
        spørsmål: "AI telefonresepsjonist klinikk hvordan fungerer fordeler",
      }, { days: 7 })
    );

    const output = await step.run("beacon-analyserer", () =>
      beacon.run(
        {
          message: `Mandag ${dagsDato()}. Lever ukentlig SEO-analyse for SvarAI.

SØKEDATA FRA NETTET:

Relevante søkeord og volum-signaler:
${data.keywords}

Konkurrenter og deres innhold:
${data.konkurrenter}

Content-trender:
${data.trender}

Vanlige spørsmål folk søker på:
${data.spørsmål}

Analyser dette og lever: (1) 3 høyprioritets søkeord vi bør rangere på, (2) innholdsgap vs. konkurrenter, (3) 3 konkrete blogg-temaer med tittelforslag til Muse.`,
        },
        ctx
      )
    );

    // Gi Muse input for uka
    await step.run("brief-muse", async () => {
      await inngest.send({
        name: "beacon/seo.ready",
        data: { anbefalinger: output.summary, beaconRunId: runId, dato: new Date().toISOString() },
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
    const p = safePayload(event.data, ["anbefalinger", "beaconRunId"]);
    if (!p.anbefalinger) {
      console.warn("[muse] beacon/seo.ready mangler anbefalinger");
      return { skipped: true, reason: "missing_anbefalinger" };
    }
    const { ctx, runId, logs, persistRun } = makeCtx("muse", p.beaconRunId ?? undefined);
    const output = await step.run("muse-skriver-seo", () =>
      muse.run(
        { message: `Beacon anbefaler disse SEO-temaene:\n\n${p.anbefalinger}\n\nVelg det beste temaet og skriv innhold optimalisert for det.` },
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
    const p = safePayload(event.data, ["innhold", "museRunId"]);
    if (!p.innhold) {
      console.warn("[prism] muse/content.ready mangler innhold");
      return { skipped: true, reason: "missing_innhold" };
    }
    const { ctx, runId, logs, persistRun } = makeCtx("prism", p.museRunId ?? undefined);
    const innhold = p.innhold;

    const output = await step.run("prism-reviewerer", () =>
      prism.run(
        { message: `Review dette innholdet fra Muse for brand-samsvar:\n\n${innhold}` },
        ctx
      )
    );

    // Robust approval detection — check multiple patterns, avoid false negatives
    const summaryLower = output.summary.toLowerCase();
    const godkjent =
      output.summary.includes("✅") ||
      summaryLower.includes("godkjent") ||
      summaryLower.includes("approved") ||
      summaryLower.includes("klar for publisering") ||
      summaryLower.includes("kan publiseres") ||
      summaryLower.includes("ser bra ut") ||
      summaryLower.includes("anbefaler publisering");

    const avvist =
      summaryLower.includes("ikke godkjent") ||
      summaryLower.includes("avvist") ||
      summaryLower.includes("rejected") ||
      summaryLower.includes("bør endres") ||
      summaryLower.includes("ikke klar");

    if (godkjent && !avvist) {
      await step.run("send-til-echo", async () => {
        await inngest.send({
          name: "prism/content.approved",
          data: { innhold, review: output.summary, prismRunId: runId },
        });
      });
    } else if (avvist) {
      // Send tilbake til Muse for revisjon
      await step.run("send-til-muse-revisjon", async () => {
        await inngest.send({
          name: "prism/content.rejected",
          data: { innhold, feedback: output.summary, prismRunId: runId },
        });
      });
    }

    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, review: output.summary, godkjent: godkjent && !avvist, usage: output.usage, logs };
  }
);

// Prism reviewer også Hermes-outreach
export const prismReviewerOutreach = inngest.createFunction(
  { id: "prism-outreach-review", name: "Prism · Outreach brand review", retries: 1 },
  { event: "hermes/outreach.sent" },
  async ({ event, step }) => {
    const p = safePayload(event.data, ["mottakere", "hermesRunId"]);
    if (!p.mottakere) {
      console.warn("[prism] hermes/outreach.sent mangler mottakere — hopper over");
      return { skipped: true, reason: "missing_mottakere" };
    }
    const { ctx, runId, logs, persistRun } = makeCtx("prism", p.hermesRunId ?? undefined);
    const output = await step.run("prism-reviewerer-outreach", () =>
      prism.run(
        { message: `Review denne outreach-batchen fra Hermes for brand-samsvar og tone:\n\n${p.mottakere}` },
        ctx
      )
    );
    await step.run("lagre-kjøring", () => persistRun(output, "event"));

    return { runId, review: output.summary, usage: output.usage, logs };
  }
);

// ─── Muse — revisjon etter Prism-avvisning ────────────────────────────────

export const museRevisjon = inngest.createFunction(
  { id: "muse-revisjon", name: "Muse · Revisjon etter Prism-avvisning", retries: 1 },
  { event: "prism/content.rejected" },
  async ({ event, step }) => {
    const p = safePayload(event.data, ["innhold", "feedback"]);
    if (!p.innhold || !p.feedback) {
      console.warn("[muse] prism/content.rejected mangler innhold eller feedback");
      return { skipped: true, reason: "missing_payload" };
    }
    const { ctx, runId, logs, persistRun } = makeCtx("muse");
    const { innhold, feedback } = p;

    const output = await step.run("muse-reviderer", () =>
      muse.run(
        {
          message: `Prism avviste innholdet ditt med følgende tilbakemelding:\n\n${feedback}\n\nOriginalt innhold:\n${innhold}\n\nRevider innholdet basert på tilbakemeldingen. Hold budskapet, fix problemene.`,
        },
        ctx
      )
    );

    // Send revidert innhold tilbake til Prism
    await step.run("send-til-prism-igjen", async () => {
      await inngest.send({
        name: "muse/content.ready",
        data: { innhold: output.summary, museRunId: runId, kilde: "revisjon" },
      });
    });

    await step.run("lagre-kjøring", () => persistRun(output, "event"));

    return { runId, revisjon: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);

// ─── Echo — distribusjon (trigges av Prism-godkjenning) ──────────────────

export const echoDistribuerer = inngest.createFunction(
  { id: "echo-distribuerer", name: "Echo · Distribuerer innhold", retries: 2 },
  { event: "prism/content.approved" },
  async ({ event, step }) => {
    const p = safePayload(event.data, ["innhold", "prismRunId"]);
    if (!p.innhold) {
      console.warn("[echo] prism/content.approved mangler innhold");
      return { skipped: true, reason: "missing_innhold" };
    }
    const { ctx, runId, logs, persistRun } = makeCtx("echo", p.prismRunId ?? undefined);
    const innhold = p.innhold;

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
