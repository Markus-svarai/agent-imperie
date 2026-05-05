/**
 * GET /api/runs?limit=50  → siste N agent-kjøringer
 */

import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/api/auth";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") ?? "50"),
    200
  );

  try {
    const rows = await db
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
        department: schema.agents.department,
        model: schema.agents.model,
      })
      .from(schema.agentRuns)
      .innerJoin(schema.agents, eq(schema.agentRuns.agentId, schema.agents.id))
      .where(eq(schema.agentRuns.orgId, DEFAULT_ORG_ID))
      .orderBy(desc(schema.agentRuns.createdAt))
      .limit(limit);

    const runs = rows.map((r) => ({
      id: r.id,
      agentName: r.agentName,
      department: r.department,
      model: r.model,
      status: r.status,
      trigger: r.trigger,
      startedAt: r.startedAt?.toISOString() ?? null,
      endedAt: r.endedAt?.toISOString() ?? null,
      durationMs: r.durationMs,
      inputTokens: r.inputTokens ?? 0,
      outputTokens: r.outputTokens ?? 0,
      costMicroUsd: r.costMicroUsd ?? 0,
      summary: (r.output as { summary?: string } | null)?.summary ?? "",
    }));

    return NextResponse.json({ runs });
  } catch (err) {
    console.error("[api/runs] Feil:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
