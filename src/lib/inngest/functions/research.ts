import { inngest } from "../client";
import { makeCtx, dagsDato } from "../utils";
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
    const { ctx, runId, logs } = makeCtx("darwin");
    const output = await step.run("darwin-analyserer", () =>
      darwin.run(
        { message: `Mandag ${dagsDato()}. Analyser brukerfeedback og lever ukentlig product brief med de 3 viktigste features å implementere.` },
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

    return { runId, brief: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);

// Darwin kan trigges av spesifikk feedback
export const darwinAnalyserFeedback = inngest.createFunction(
  { id: "darwin-analyser-feedback", name: "Darwin · Analyser feedback", retries: 1 },
  { event: "darwin/feedback.inngitt" },
  async ({ event, step }) => {
    const { ctx, runId, logs } = makeCtx("darwin");
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
    return { runId, analyse: output.summary, usage: output.usage, logs };
  }
);

// ─── Atlas — teknisk research (onsdager 10:00) ────────────────────────────

export const atlasTekniskResearch = inngest.createFunction(
  { id: "atlas-teknisk-research", name: "Atlas · Teknisk research", retries: 1 },
  { cron: "0 10 * * 3" },
  async ({ step }) => {
    const { ctx, runId, logs } = makeCtx("atlas");
    const output = await step.run("atlas-forsker", () =>
      atlas.run(
        { message: `Onsdag ${dagsDato()}. Lever teknisk forskningsrapport — evaluer ny teknologi og arkitekturforbedringer for SvarAI.` },
        ctx
      )
    );
    return { runId, rapport: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);

// ─── Silo — nattlig kunnskapsbase-oppdatering (22:00) ────────────────────

export const siloByggerKunnskapsbase = inngest.createFunction(
  { id: "silo-kunnskapsbase", name: "Silo · Kunnskapsbase-oppdatering", retries: 2 },
  { cron: "0 22 * * *" },
  async ({ step }) => {
    const { ctx, runId, logs } = makeCtx("silo");
    const output = await step.run("silo-dokumenterer", () =>
      silo.run(
        { message: `Det er ${dagsDato()} kl. 22:00. Oppdater kunnskapsbasen basert på dagens agent-aktivitet. Dokumenter viktige beslutninger og lærte mønstre.` },
        ctx
      )
    );
    return { runId, oppdatering: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);

// Silo trigges når Jarvis tar en viktig beslutning
export const siloLoggBeslutning = inngest.createFunction(
  { id: "silo-logg-beslutning", name: "Silo · Logger Jarvis-beslutning", retries: 1 },
  { event: "jarvis/beslutning.tatt" },
  async ({ event, step }) => {
    const { ctx, runId, logs } = makeCtx("silo");
    const output = await step.run("silo-logger", () =>
      silo.run(
        { message: `Jarvis tok en viktig beslutning:\n\n${event.data.beslutning as string}\n\nLogg dette i kunnskapsbasen for fremtidig referanse.` },
        ctx
      )
    );
    return { runId, logg: output.summary, usage: output.usage, logs };
  }
);
