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
 * Check if the global kill switch is active.
 * Returns true if agents should run, false if halted.
 * Reads from DB first; falls back to SYSTEM_ENABLED env var (default: true).
 */
export async function isSystemEnabled(): Promise<boolean> {
  // Env override takes priority — useful for emergency stops without a DB round-trip
  const envFlag = process.env.SYSTEM_ENABLED;
  if (envFlag === "false") return false;

  try {
    const org = await db.query.orgs.findFirst({
      where: eq(schema.orgs.id, DEFAULT_ORG_ID),
      columns: { systemEnabled: true },
    });
    return org?.systemEnabled ?? true;
  } catch {
    // If DB check fails, default to enabled so we don't accidentally halt everything
    return true;
  }
}

/**
 * Factory — builds a fresh AgentContext + collects logs in-memory.
 * Also returns `persistRun` to save the completed run to Supabase.
 * Pass parentRunId to link this run to the triggering run for traceability.
 */
export function makeCtx(agentId: string, parentRunId?: string) {
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
   * Returns true if system is halted — call this BEFORE agent.run().
   * Usage: if (await isHalted()) return { skipped: true };
   */
  const isHalted = async (): Promise<boolean> => {
    const enabled = await isSystemEnabled();
    if (!enabled) {
      console.warn(`[${agentId}] System er deaktivert (kill switch). Hopper over kjøring.`);
    }
    return !enabled;
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
        parentRunId: parentRunId ?? null,
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

  return { ctx, runId, logs, persistRun, isHalted };
}

/**
 * Safe payload extractor for Inngest event handlers.
 * Returns null for missing fields instead of crashing on undefined.
 * Usage: const p = safePayload(event.data, ["from","subject","text"]);
 */
export function safePayload<T extends string>(
  data: unknown,
  fields: T[]
): Record<T, string | null> {
  const obj = (data ?? {}) as Record<string, unknown>;
  const result = {} as Record<T, string | null>;
  for (const field of fields) {
    const val = obj[field];
    result[field] = val != null ? String(val) : null;
  }
  return result;
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
