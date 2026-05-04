import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc, and } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";
import { checkAuth } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
    const department = searchParams.get("dept") ?? null;

    type Department = typeof schema.agents.$inferSelect["department"];
    const conditions = [eq(schema.agentRuns.orgId, DEFAULT_ORG_ID)];
    if (department) {
      conditions.push(eq(schema.agents.department, department as Department));
    }

    const runs = await db
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
        agentModel: schema.agents.model,
      })
      .from(schema.agentRuns)
      .leftJoin(schema.agents, eq(schema.agentRuns.agentId, schema.agents.id))
      .where(and(...conditions))
      .orderBy(desc(schema.agentRuns.createdAt))
      .limit(limit);

    return NextResponse.json({
      runs: runs.map((r) => ({
        id: r.id,
        agentName: r.agentName ?? "Ukjent",
        department: r.agentDepartment ?? "command",
        model: r.agentModel ?? "claude-sonnet-4-6",
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
  } catch (err) {
    console.error("[runs] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
