import { inngest } from "../client";
import { makeCtx, dagsDato } from "../utils";
import { searchMany } from "@/lib/tools/search";
import { AthenaAgent } from "@/lib/agents/command";
import { OracleAgent } from "@/lib/agents/command";
import { NexusAgent } from "@/lib/agents/command";

const athena = new AthenaAgent();
const oracle = new OracleAgent();
const nexus = new NexusAgent();

// ─── Athena — ukentlig strategiplan (mandag 08:00) ───────────────────────

export const athenaUkestrategi = inngest.createFunction(
  { id: "athena-ukestrategi", name: "Athena · Ukentlig strategi", retries: 1 },
  { cron: "0 8 * * 1" },
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("athena");

    // Hent strategisk kontekst fra nettet
    const data = await step.run("hent-strategidata", () =>
      searchMany({
        marked: "AI resepsjonist klinikk marked Norge 2025",
        konkurrenter: "SvarAI konkurrenter AI booking klinikk",
        trender: "healthcare AI automation trends 2025",
      })
    );

    const output = await step.run("athena-analyserer", () =>
      athena.run(
        {
          message: `Det er ${dagsDato()}. Lever ukentlig strategianalyse for SvarAI.

MARKEDSDATA FRA NETTET:

Markedssituasjon:
${data.marked}

Konkurrenter:
${data.konkurrenter}

Trender:
${data.trender}

Basert på dette — analyser posisjon, trusler og muligheter. Gi konkrete strategiske prioriteringer for neste uke.`,
        },
        ctx
      )
    );
    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, summary: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);

// Athena reagerer også når Oracle leverer intel
export const athenaReagerPaaIntel = inngest.createFunction(
  { id: "athena-reagerer-intel", name: "Athena · Reagerer på markedsintel", retries: 1 },
  { event: "oracle/intel.ready" },
  async ({ event, step }) => {
    const oracleRunId = (event.data as Record<string, unknown>).oracleRunId as string | undefined;
    const { ctx, runId, logs, persistRun } = makeCtx("athena", oracleRunId);
    const output = await step.run("athena-vurderer-intel", () =>
      athena.run(
        { message: `Oracle har levert ny markedsintelligens:\n\n${event.data.rapport as string}\n\nVurder om dette krever strategijusteringer.` },
        ctx
      )
    );
    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, summary: output.summary, usage: output.usage, logs };
  }
);

// ─── Oracle — daglig markedsovervåking (07:00) ────────────────────────────

export const oracleDagligIntel = inngest.createFunction(
  { id: "oracle-daglig-intel", name: "Oracle · Daglig markedsintelligens", retries: 2 },
  { cron: "0 7 * * *" },
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("oracle");

    // Hent ferskt fra nettet før analyse
    const data = await step.run("hent-markedsdata", () =>
      searchMany({
        nyheter: `AI healthcare klinikk nyheter ${new Date().toLocaleDateString("nb-NO")}`,
        konkurrenter: "AI resepsjonist tannlege lege hudklinikk konkurrenter",
        svarAI: "SvarAI OR \"AI resepsjonist\" klinikk",
        internasjonalt: "AI medical receptionist startup funding 2025",
      }, { days: 3 })
    );

    const output = await step.run("oracle-snoker", () =>
      oracle.run(
        {
          message: `Dato: ${dagsDato()}. Lever dagens markedsintelligens for SvarAI.

FERSKESTE DATA FRA NETTET:

Nyheter i dag:
${data.nyheter}

Konkurrenter:
${data.konkurrenter}

SvarAI-omtaler:
${data.svarAI}

Internasjonale bevegelser:
${data.internasjonalt}

Analyser dette og lever ett strukturert intel-sammendrag: hva skjer, hvem beveger seg, og hva betyr det for SvarAI?`,
        },
        ctx
      )
    );

    // Publiser for Athena og Sage
    await step.run("publiser-intel", async () => {
      await inngest.send({
        name: "oracle/intel.ready",
        data: { rapport: output.summary, oracleRunId: runId, dato: new Date().toISOString() },
      });
    });

    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, rapport: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);

// ─── Nexus — daglig koordinering (06:30) ─────────────────────────────────

export const nexusDagligKoordinering = inngest.createFunction(
  { id: "nexus-daglig-koordinering", name: "Nexus · Daglig koordinering", retries: 1 },
  { cron: "30 6 * * *" },
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("nexus");
    const output = await step.run("nexus-koordinerer", () =>
      nexus.run(
        { message: `Det er ${dagsDato()}. Lever daglig koordineringsplan for agentflåten.` },
        ctx
      )
    );
    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, plan: output.summary, usage: output.usage, logs };
  }
);
