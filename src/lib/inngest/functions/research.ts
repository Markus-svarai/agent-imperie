import { inngest } from "../client";
import { makeCtx, dagsDato } from "../utils";
import { searchMany } from "@/lib/tools/search";
import { DarwinAgent } from "@/lib/agents/research";
import { AtlasAgent } from "@/lib/agents/research";
import { SiloAgent } from "@/lib/agents/research";

const darwin = new DarwinAgent();
const atlas = new AtlasAgent();
const silo = new SiloAgent();

// ─── Darwin — ukentlig product brief (mandager 10:00) ────────────────────

export const darwinProductBrief = inngest.createFunction(
  { id: "darwin-product-brief", name: "Darwin · Ukentlig product brief", retries: 2 },
  { cron: "0 10 * * 1" },
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("darwin");

    // Research konkurrerende features og brukerbehov
    const data = await step.run("hent-produktdata", () =>
      searchMany({
        features: "AI resepsjonist klinikk features booking SMS 2025",
        brukerfeedback: "\"AI receptionist\" clinic review problems complaints",
        konkurrenter: "Klara Avy Hyro Dialpad healthcare AI features",
        teknologi: "LLM voice AI appointment booking best practices 2025",
      }, { days: 14 })
    );

    const output = await step.run("darwin-analyserer", () =>
      darwin.run(
        {
          message: `Mandag ${dagsDato()}. Lag ukentlig product brief for SvarAI.

RESEARCH FRA MARKEDET:

Features i markedet:
${data.features}

Brukerfeedback og problemer:
${data.brukerfeedback}

Konkurrentanalyse:
${data.konkurrenter}

Relevant teknologi:
${data.teknologi}

Basert på dette: identifiser de 3 viktigste features SvarAI bør implementere neste. Vær spesifikk med akseptansekriterier.`,
        },
        ctx
      )
    );

    // Send spec til Forge for implementering
    await step.run("send-til-forge", async () => {
      await inngest.send({
        name: "darwin/brief.ready",
        data: { spec: output.summary, darwinRunId: runId },
      });
    });

    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, brief: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);

// Darwin kan trigges av spesifikk feedback
export const darwinAnalyserFeedback = inngest.createFunction(
  { id: "darwin-analyser-feedback", name: "Darwin · Analyser feedback", retries: 1 },
  { event: "darwin/feedback.inngitt" },
  async ({ event, step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("darwin");
    const output = await step.run("darwin-analyserer-feedback", () =>
      darwin.run(
        { message: `Ny brukerfeedback mottatt:\n\n${event.data.feedback as string}\n\nAnalyser og lag en product brief basert på dette.` },
        ctx
      )
    );
    await step.run("send-til-forge", async () => {
      await inngest.send({
        name: "darwin/brief.ready",
        data: { spec: output.summary, darwinRunId: runId, kilde: "manuell-feedback" },
      });
    });
    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, analyse: output.summary, usage: output.usage, logs };
  }
);

// ─── Atlas — teknisk research (onsdager 10:00) ────────────────────────────

export const atlasTekniskResearch = inngest.createFunction(
  { id: "atlas-teknisk-research", name: "Atlas · Teknisk research", retries: 1 },
  { cron: "0 10 * * 3" },
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("atlas");

    // Hent teknisk research
    const data = await step.run("hent-tech-data", () =>
      searchMany({
        llm: "latest LLM voice AI telephony integration 2025",
        arkitektur: "Next.js Supabase Inngest production architecture patterns",
        verktøy: "AI agent orchestration tools open source 2025",
        sikkerhet: "GDPR AI healthcare data compliance Norway 2025",
      }, { days: 14 })
    );

    const output = await step.run("atlas-forsker", () =>
      atlas.run(
        {
          message: `Onsdag ${dagsDato()}. Lever teknisk forskningsrapport for SvarAI.

TEKNISK RESEARCH FRA NETTET:

Nye LLM/voice-teknologier:
${data.llm}

Arkitektur og patterns:
${data.arkitektur}

Relevante verktøy:
${data.verktøy}

Sikkerhet og compliance:
${data.sikkerhet}

Analyser og anbefal: hva bør vi adoptere, hva bør vi følge med på, og hva kan vi ignorere?`,
        },
        ctx
      )
    );
    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, rapport: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);

// ─── Silo — nattlig kunnskapsbase-oppdatering (22:00) ────────────────────

export const siloByggerKunnskapsbase = inngest.createFunction(
  { id: "silo-kunnskapsbase", name: "Silo · Kunnskapsbase-oppdatering", retries: 2 },
  { cron: "0 22 * * *" },
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("silo");
    const output = await step.run("silo-dokumenterer", () =>
      silo.run(
        { message: `Det er ${dagsDato()} kl. 22:00. Oppdater kunnskapsbasen basert på dagens agent-aktivitet. Dokumenter viktige beslutninger og lærte mønstre.` },
        ctx
      )
    );
    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, oppdatering: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);

// Silo trigges når Jarvis tar en viktig beslutning
export const siloLoggBeslutning = inngest.createFunction(
  { id: "silo-logg-beslutning", name: "Silo · Logger Jarvis-beslutning", retries: 1 },
  { event: "jarvis/beslutning.tatt" },
  async ({ event, step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("silo");
    const output = await step.run("silo-logger", () =>
      silo.run(
        { message: `Jarvis tok en viktig beslutning:\n\n${event.data.beslutning as string}\n\nLogg dette i kunnskapsbasen for fremtidig referanse.` },
        ctx
      )
    );
    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, logg: output.summary, usage: output.usage, logs };
  }
);
