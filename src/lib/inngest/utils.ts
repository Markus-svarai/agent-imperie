import type { AgentContext } from "@/lib/agents/types";

/**
 * Factory — builds a fresh AgentContext + collects logs in-memory.
 * Every Inngest function calls this instead of repeating the boilerplate.
 */
export function makeCtx(agentId: string) {
  const runId = `${agentId}-${Date.now()}`;
  const logs: Array<{ type: string; ts: string; [k: string]: unknown }> = [];

  const ctx: AgentContext = {
    orgId: "default",
    agentId,
    runId,
    log: async (type, payload) => {
      logs.push({ type, ...payload, ts: new Date().toISOString() });
      return runId;
    },
  };

  return { ctx, runId, logs };
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
