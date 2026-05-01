import { inngest } from "../client";
import { makeCtx, dagsDato } from "../utils";
import { JarvisAgent } from "@/lib/agents/jarvis";

const jarvis = new JarvisAgent();

// Reagerer på Guardian-varsler
export const jarvisGuardianAlert = inngest.createFunction(
  {
    id: "jarvis-guardian-alert",
    name: "Jarvis · Håndter Guardian-varsel",
    retries: 1,
  },
  { event: "guardian/alert" },
  async ({ event, step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("jarvis");

    const output = await step.run("jarvis-vurderer-varsel", async () => {
      const feil = event.data.feil as Array<{ name: string; error?: string; httpStatus?: number }>;
      const melding = `Guardian rapporterer systemfeil. Detaljer:
${feil.map((f) => `- ${f.name}: ${f.error ?? `HTTP ${f.httpStatus}`}`).join("\n")}

Tidspunkt: ${event.data.timestamp}

Vurder alvorlighetsgraden og gi en handlingsplan.`;

      return jarvis.run({ message: melding }, ctx);
    });

    await step.run("lagre-kjøring", () => persistRun(output, "event"));

    return { runId, trigger: "guardian/alert", analyse: output.summary, usage: output.usage, logs };
  }
);

// Morgenorkestrering — Jarvis planlegger dagen
export const jarvisMorgenplan = inngest.createFunction(
  {
    id: "jarvis-morgenplan",
    name: "Jarvis · Morgenorkestrering",
    retries: 1,
  },
  { cron: "15 6 * * *" }, // 15 min etter Ledger (som kjører kl 06:00)
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("jarvis");

    const output = await step.run("jarvis-planlegger-dagen", async () => {
      const melding = `Det er ${dagsDato()}. Ledger har nettopp levert sin daglige brief.

Som operasjonssjef: gi en kort morgenplan for agentflåten i dag.
Hvilke agenter bør prioriteres? Er det noe spesielt å følge opp?
Vær konkret og handlekraftig.`;

      return jarvis.run({ message: melding }, ctx);
    });

    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, trigger: "cron-morgen", morgenplan: output.summary, usage: output.usage, logs };
  }
);
