import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc, and } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentName = searchParams.get("agent");
  const type = searchParams.get("type");
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100);

  const conditions = [eq(schema.artifacts.orgId, DEFAULT_ORG_ID)];

  if (type) {
    conditions.push(
      eq(schema.artifacts.type, type as typeof schema.artifacts.$inferSelect.type)
    );
  }

  let agentId: string | null = null;
  if (agentName) {
    const agent = await db.query.agents.findFirst({
      where: eq(schema.agents.name, agentName),
      columns: { id: true },
    });
    if (agent) {
      agentId = agent.id;
      conditions.push(eq(schema.artifacts.agentId, agent.id));
    }
  }

  const rows = await db
    .select({
      id: schema.artifacts.id,
      type: schema.artifacts.type,
      title: schema.artifacts.title,
      content: schema.artifacts.content,
      createdAt: schema.artifacts.createdAt,
      agentName: schema.agents.name,
      agentDepartment: schema.agents.department,
    })
    .from(schema.artifacts)
    .leftJoin(schema.agents, eq(schema.artifacts.agentId, schema.agents.id))
    .where(and(...conditions))
    .orderBy(desc(schema.artifacts.createdAt))
    .limit(limit);

  return NextResponse.json(rows);
}
