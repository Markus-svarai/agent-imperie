import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";
import type { AgentContext, AgentOutput } from "@/lib/agents/types";
import { notifySlack, runCompletedMessage, anomalyMessage } from "@/lib/notify/slack";

/** Convert full model string → cost tier */
function modelToCost(model: string): { input: number; output: number } {
  if (model.includes("opus")) return { input: 15, output: 75 };
  if (model.includes("haiku")) return { input: 1, output: 5 };
  return { input: 3, output: 15 }; // sonnet default
}

/**
 * Factory — builds a fresh AgentContext + collects logs in-memory.
 * Also returns `persistRun` to save the completed run to Supabase.
 */
export function makeCtx(agentId: string) {
  const runId = `${agentId}-${Date.now()}`;
  const logs: Array<{ type: string; ts: string; [k: string]: unknown }> = [];
  const startedAt = new Date();

  const ctx: AgentContext = {
    orgId: DEFAULT_ORG_ID,
    agentId,
    runId,
    log: async (type, payload) => {
      logs.push({ type, ...payload, ts: new Date().toISOString() });
      return runId;
    },
  };

  /**
   * Call this after agent.run() inside a step.run to persist to Supabase.
   * Never throws — logs error and continues silently.
   */
  const persistRun = async (
    output: AgentOutput,
    trigger: "schedule" | "event" | "manual" = "schedule"
  ) => {
    try {
      const agentName = agentId.charAt(0).toUpperCase() + agentId.slice(1);
      const agentRecord = await db.query.agents.findFirst({
        where: eq(schema.agents.name, agentName),
      });

      if (!agentRecord) {
        console.warn(`[persistRun] Agent not seeded: ${agentName}`);
        return;
      }

      const rate = modelToCost(agentRecord.model);
      const inputTokens = output.usage?.inputTokens ?? 0;
      const outputTokens = output.usage?.outputTokens ?? 0;
      const costMicroUsd = inputTokens * rate.input + outputTokens * rate.output;

      const endedAt = new Date();
      const durationMs = endedAt.getTime() - startedAt.getTime();

      await db.insert(schema.agentRuns).values({
        orgId: DEFAULT_ORG_ID,
        agentId: agentRecord.id,
        status: "completed",
        trigger,
        input: { runId },
        output: { summary: output.summary },
        startedAt,
        endedAt,
        durationMs,
        inputTokens,
        outputTokens,
        costMicroUsd,
      });

      // Slack: notify on manual triggers always, or when anomaly detected
      const summary = output.summary ?? "";
      const isAnomaly =
        summary.includes("⚠️") ||
        summary.toLowerCase().includes("anomali") ||
        summary.toLowerCase().includes("kritisk");

      if (trigger === "manual") {
        const agentName = agentId.charAt(0).toUpperCase() + agentId.slice(1);
        const msg = runCompletedMessage(agentName, durationMs, inputTokens, outputTokens, summary, trigger);
        void notifySlack(msg.text, msg.blocks);
      } else if (isAnomaly) {
        const agentName = agentId.charAt(0).toUpperCase() + agentId.slice(1);
        const msg = anomalyMessage(agentName, summary);
        void notifySlack(msg.text, msg.blocks);
      }
    } catch (err) {
      console.error("[persistRun] Failed:", err);
    }
  };

  return { ctx, runId, logs, persistRun };
}

/** Readable date string in Norwegian for use in prompts / artifact titles. */
export function dagsDato() {
  return new Date().toLocaleDateString("nb-NO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
