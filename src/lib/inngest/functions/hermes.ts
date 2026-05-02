import { inngest } from "../client";
import { makeCtx, safePayload } from "../utils";
import { HermesAgent } from "@/lib/agents/hermes";
import { setMemory } from "@/lib/tools/memory";

const hermes = new HermesAgent();

// Trigges automatisk av Nova
export const hermesSkrivMeldinger = inngest.createFunction(
  {
    id: "hermes-skriv-meldinger",
    name: "Hermes · Skriv outreach-meldinger",
    retries: 2,
  },
  { event: "nova/leads.ready" },
  async ({ event, step }) => {
    const p = safePayload(event.data, ["novaRunId", "leadliste"]);
    const { ctx, runId, logs, persistRun, isHalted } = makeCtx("hermes", p.novaRunId ?? undefined);
    if (await step.run("sjekk-kill-switch", isHalted)) return { skipped: true };

    if (!p.leadliste) {
      console.warn("[hermes] nova/leads.ready mangler leadliste — hopper over");
      return { skipped: true, reason: "missing_leadliste" };
    }

    const output = await step.run("hermes-skriver", async () => {
      return hermes.run({ data: { leadliste: p.leadliste } }, ctx);
    });

    // Fire event so Titan knows outreach was sent — pass hermesRunId for traceability
    await step.run("varsle-titan", async () => {
      await inngest.send({
        name: "hermes/outreach.sent",
        data: {
          mottakere: output.summary,
          hermesRunId: runId,
          dato: new Date().toISOString(),
        },
      });
    });

    await step.run("lagre-kjøring", () => persistRun(output, "event"));

    return {
      runId,
      trigger: "nova/leads.ready",
      meldinger: output.summary,
      artifacts: output.artifacts,
      usage: output.usage,
      logs,
    };
  }
);

// Kan også kjøres manuelt med egne prospekter
export const hermesManuelOpdrag = inngest.createFunction(
  {
    id: "hermes-manuelt-oppdrag",
    name: "Hermes · Manuelt oppdrag",
    retries: 1,
  },
  { event: "hermes/skriv" },
  async ({ event, step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("hermes");

    const output = await step.run("hermes-manuelt", async () => {
      return hermes.run({ message: event.data.prospekter as string }, ctx);
    });

    await step.run("lagre-kjøring", () => persistRun(output, "manual"));

    return {
      runId,
      trigger: "manuelt",
      meldinger: output.summary,
      artifacts: output.artifacts,
      usage: output.usage,
      logs,
    };
  }
);

// ─── Scribe-funn → Hermes-hukommelse ─────────────────────────────────────────
// Når Scribe identifiserer mønstre om hva slags klinikker som svarer,
// oppdaterer vi Hermes sin hukommelse så outreach forbedres over tid.

export const hermesLaererAvScribe = inngest.createFunction(
  { id: "hermes-laerer-av-scribe", name: "Hermes · Lærer av Scribe-funn", retries: 1 },
  { event: "scribe/patterns.found" },
  async ({ event, step }) => {
    const patterns = event.data.patterns as string;

    await step.run("lagre-scribe-funn", () =>
      setMemory("hermes", "scribe_patterns", {
        patterns,
        updatedAt: new Date().toISOString(),
      })
    );

    return { ok: true, savedFor: "hermes" };
  }
);
