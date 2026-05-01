import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, desc, count, sum } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agentName = id.charAt(0).toUpperCase() + id.slice(1);

  const agent = await db.query.agents.findFirst({
    where: and(
      eq(schema.agents.orgId, DEFAULT_ORG_ID),
      eq(schema.agents.name, agentName)
    ),
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent ikke funnet" }, { status: 404 });
  }

  // Last 30 runs
  const runs = await db
    .select()
    .from(schema.agentRuns)
    .where(
      and(
        eq(schema.agentRuns.agentId, agent.id),
        eq(schema.agentRuns.orgId, DEFAULT_ORG_ID)
      )
    )
    .orderBy(desc(schema.agentRuns.createdAt))
    .limit(30);

  // Aggregate stats
  const [stats] = await db
    .select({
      totalRuns: count(),
      totalInputTokens: sum(schema.agentRuns.inputTokens),
      totalOutputTokens: sum(schema.agentRuns.outputTokens),
      totalCostMicroUsd: sum(schema.agentRuns.costMicroUsd),
    })
    .from(schema.agentRuns)
    .where(
      and(
        eq(schema.agentRuns.agentId, agent.id),
        eq(schema.agentRuns.orgId, DEFAULT_ORG_ID)
      )
    );

  const completedRuns = runs.filter((r) => r.status === "completed").length;

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      department: agent.department,
      role: agent.role,
      model: agent.model,
      description: agent.description,
      schedule: agent.schedule,
      status: agent.status,
    },
    stats: {
      totalRuns: Number(stats?.totalRuns ?? 0),
      completedRuns,
      successRate:
        runs.length > 0 ? Math.round((completedRuns / runs.length) * 100) : 0,
      totalTokens:
        Number(stats?.totalInputTokens ?? 0) +
        Number(stats?.totalOutputTokens ?? 0),
      totalCostUsd:
        Number(stats?.totalCostMicroUsd ?? 0) / 1_000_000,
    },
    runs: runs.map((r) => ({
      id: r.id,
      status: r.status,
      trigger: r.trigger,
      startedAt: r.startedAt?.toISOString() ?? null,
      endedAt: r.endedAt?.toISOString() ?? null,
      durationMs: r.durationMs,
      inputTokens: r.inputTokens ?? 0,
      outputTokens: r.outputTokens ?? 0,
      costMicroUsd: r.costMicroUsd ?? 0,
      summary: (r.output as Record<string, unknown>)?.summary as string ?? "",
    })),
  });
}
