import { inngest } from "../client";
import { JarvisAgent } from "@/lib/agents/jarvis";
import type { AgentContext } from "@/lib/agents/types";

const jarvis = new JarvisAgent();

function lagKontekst(runId: string) {
  const logs: unknown[] = [];
  const ctx: AgentContext = {
    orgId: "default",
    agentId: "jarvis",
    runId,
    log: async (type, payload) => {
      logs.push({ type, ...payload, ts: new Date().toISOString() });
      return runId;
    },
  };
  return { ctx, logs };
}

// Reagerer på Guardian-varsler
export const jarvisGuardianAlert = inngest.createFunction(
  {
    id: "jarvis-guardian-alert",
    name: "Jarvis · Håndter Guardian-varsel",
    retries: 1,
  },
  { event: "guardian/alert" },
  async ({ event, step }) => {
    const runId = `jarvis-alert-${Date.now()}`;
    const { ctx, logs } = lagKontekst(runId);

    const output = await step.run("jarvis-vurderer-varsel", async () => {
      const feil = event.data.feil as Array<{ name: string; error?: string; httpStatus?: number }>;
      const melding = `Guardian rapporterer systemfeil. Detaljer:
${feil.map((f) => `- ${f.name}: ${f.error ?? `HTTP ${f.httpStatus}`}`).join("\n")}

Tidspunkt: ${event.data.timestamp}

Vurder alvorlighetsgraden og gi en handlingsplan.`;

      return jarvis.run({ message: melding }, ctx);
    });

    return {
      runId,
      trigger: "guardian/alert",
      analyse: output.summary,
      usage: output.usage,
      logs,
    };
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
    const runId = `jarvis-morgen-${Date.now()}`;
    const { ctx, logs } = lagKontekst(runId);

    const output = await step.run("jarvis-planlegger-dagen", async () => {
      const dato = new Date().toLocaleDateString("nb-NO", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const melding = `Det er ${dato}. Ledger har nettopp levert sin daglige brief.

Som operasjonssjef: gi en kort morgenplan for agentflåten i dag.
Hvilke agenter bør prioriteres? Er det noe spesielt å følge opp?
Vær konkret og handlekraftig.`;

      return jarvis.run({ message: melding }, ctx);
    });

    return {
      runId,
      trigger: "cron-morgen",
      morgenplan: output.summary,
      usage: output.usage,
      logs,
    };
  }
);
