/**
 * memory.ts — Agent long-term memory tools.
 *
 * Agents use this to remember what worked, what failed, and what they've learned.
 * Each memory is keyed by (agentId, key) and stored as JSONB.
 *
 * Typical keys:
 *   nova:     "rejection_patterns", "icp_learnings", "location_heatmap"
 *   hermes:   "successful_openings", "failed_subject_lines", "best_cta_by_location"
 *   titan:    "common_objections", "winning_responses", "demo_conversion_rate"
 *   athena:   "strategic_context", "open_hypotheses"
 */

import { db, schema } from "@/lib/db";
import { and, eq, desc } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";

// ─── Read ────────────────────────────────────────────────────────────────────

/** Get a single memory entry for an agent */
export async function getMemory(agentId: string, key: string): Promise<unknown> {
  const row = await db.query.agentMemory.findFirst({
    where: and(
      eq(schema.agentMemory.orgId, DEFAULT_ORG_ID),
      eq(schema.agentMemory.agentId, agentId),
      eq(schema.agentMemory.key, key)
    ),
  });
  return row?.value ?? null;
}

/** Get all memory entries for an agent */
export async function getAllMemory(agentId: string): Promise<Record<string, unknown>> {
  const rows = await db.query.agentMemory.findMany({
    where: and(
      eq(schema.agentMemory.orgId, DEFAULT_ORG_ID),
      eq(schema.agentMemory.agentId, agentId)
    ),
  });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/** Get recent agent runs summary — used by Athena for reflection */
export async function getRecentRuns(days = 7, agentName?: string) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  // Fetch runs from DB
  const runs = await db.query.agentRuns.findMany({
    where: (runs, { gte, eq, and }) =>
      agentName
        ? and(eq(runs.orgId, DEFAULT_ORG_ID), gte(runs.createdAt, cutoff))
        : and(eq(runs.orgId, DEFAULT_ORG_ID), gte(runs.createdAt, cutoff)),
    with: { agent: true },
    orderBy: (runs, { desc }) => [desc(runs.createdAt)],
    limit: 50,
  });

  return runs.map((r) => ({
    agent: r.agent?.name ?? "unknown",
    status: r.status,
    trigger: r.trigger,
    summary: (r.output as Record<string, unknown>)?.summary ?? null,
    costMicroUsd: r.costMicroUsd,
    durationMs: r.durationMs,
    createdAt: r.createdAt,
  }));
}

/** Get pending strategy proposals — used by Jarvis/notifications */
export async function getPendingProposals() {
  return db.query.strategyProposals.findMany({
    where: and(
      eq(schema.strategyProposals.orgId, DEFAULT_ORG_ID),
      eq(schema.strategyProposals.status, "pending")
    ),
    orderBy: (p, { desc }) => [desc(p.createdAt)],
    limit: 10,
  });
}

// ─── Write ───────────────────────────────────────────────────────────────────

/** Set (upsert) a memory entry */
export async function setMemory(
  agentId: string,
  key: string,
  value: unknown,
  opts?: { confidence?: number; sourceRunId?: string }
): Promise<void> {
  await db
    .insert(schema.agentMemory)
    .values({
      orgId: DEFAULT_ORG_ID,
      agentId,
      key,
      value,
      confidence: String(opts?.confidence ?? 1.0),
      sourceRunId: opts?.sourceRunId ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [schema.agentMemory.orgId, schema.agentMemory.agentId, schema.agentMemory.key],
      set: {
        value,
        confidence: String(opts?.confidence ?? 1.0),
        sourceRunId: opts?.sourceRunId ?? null,
        updatedAt: new Date(),
      },
    });
}

/**
 * Append an item to a memory array (creates if missing, caps at maxItems).
 * Useful for logging patterns: appendMemory("nova", "rejection_patterns", {specialty: "tannlege", rate: 0.8})
 */
export async function appendMemory(
  agentId: string,
  key: string,
  item: unknown,
  maxItems = 50
): Promise<void> {
  const existing = (await getMemory(agentId, key)) as unknown[] | null;
  const arr = Array.isArray(existing) ? existing : [];
  const updated = [{ ...( item as object ), timestamp: new Date().toISOString() }, ...arr].slice(0, maxItems);
  await setMemory(agentId, key, updated);
}

/** Save a strategy proposal from Athena */
export async function createStrategyProposal(input: {
  createdBy: string;
  title: string;
  summary: string;
  proposals: Array<{ area: string; problem: string; suggestion: string; priority: "high" | "medium" | "low" }>;
  runId?: string;
}): Promise<string> {
  const [inserted] = await db
    .insert(schema.strategyProposals)
    .values({
      orgId: DEFAULT_ORG_ID,
      createdBy: input.createdBy,
      title: input.title,
      summary: input.summary,
      proposals: input.proposals,
      runId: input.runId ?? null,
      status: "pending",
    })
    .returning({ id: schema.strategyProposals.id });

  return inserted.id;
}
