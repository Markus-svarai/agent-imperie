import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { and, eq, gte, sum, count, desc } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";

export const dynamic = "force-dynamic";

export const revalidate = 60; // Cache 60s

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Total runs today + tokens/cost
    const todayStats = await db
      .select({
        runs: count(),
        inputTokens: sum(schema.agentRuns.inputTokens),
        outputTokens: sum(schema.agentRuns.outputTokens),
        costMicroUsd: sum(schema.agentRuns.costMicroUsd),
      })
      .from(schema.agentRuns)
      .where(
        and(
          eq(schema.agentRuns.orgId, DEFAULT_ORG_ID),
          gte(schema.agentRuns.createdAt, today)
        )
      );

    // All-time runs
    const allTimeRuns = await db
      .select({ runs: count() })
      .from(schema.agentRuns)
      .where(eq(schema.agentRuns.orgId, DEFAULT_ORG_ID));

    // Recent runs (last 10) with agent name
    const recentRuns = await db
      .select({
        id: schema.agentRuns.id,
        status: schema.agentRuns.status,
        trigger: schema.agentRuns.trigger,
        startedAt: schema.agentRuns.startedAt,
        endedAt: schema.agentRuns.endedAt,
        durationMs: schema.agentRuns.durationMs,
        inputTokens: schema.agentRuns.inputTokens,
        outputTokens: schema.agentRuns.outputTokens,
        costMicroUsd: schema.agentRuns.costMicroUsd,
        output: schema.agentRuns.output,
        agentName: schema.agents.name,
        agentDepartment: schema.agents.department,
      })
      .from(schema.agentRuns)
      .leftJoin(schema.agents, eq(schema.agentRuns.agentId, schema.agents.id))
      .where(eq(schema.agentRuns.orgId, DEFAULT_ORG_ID))
      .orderBy(desc(schema.agentRuns.createdAt))
      .limit(10);

    // Agents count
    const agentCount = await db
      .select({ total: count() })
      .from(schema.agents)
      .where(eq(schema.agents.orgId, DEFAULT_ORG_ID));

    const stats = todayStats[0];
    const totalInputTokens = Number(stats?.inputTokens ?? 0);
    const totalOutputTokens = Number(stats?.outputTokens ?? 0);
    const totalTokens = totalInputTokens + totalOutputTokens;
    const costMicroUsd = Number(stats?.costMicroUsd ?? 0);
    const costUsd = costMicroUsd / 1_000_000;

    return NextResponse.json({
      runsToday: Number(stats?.runs ?? 0),
      allTimeRuns: Number(allTimeRuns[0]?.runs ?? 0),
      tokensToday: totalTokens,
      costTodayUsd: costUsd,
      agentsTotal: Number(agentCount[0]?.total ?? 0),
      recentRuns: recentRuns.map((r) => ({
        id: r.id,
        agentName: r.agentName ?? "Ukjent",
        department: r.agentDepartment ?? "command",
        status: r.status,
        trigger: r.trigger,
        startedAt: r.startedAt?.toISOString() ?? null,
        endedAt: r.endedAt?.toISOString() ?? null,
        durationMs: r.durationMs,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        costMicroUsd: r.costMicroUsd,
        summary: (r.output as Record<string, unknown>)?.summary as string ?? "",
      })),
    });
  } catch (err) {
    console.error("[dashboard/stats] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
