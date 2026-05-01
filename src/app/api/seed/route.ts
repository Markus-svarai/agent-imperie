import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";
import { REGISTRY } from "@/lib/agents/registry";

const MODEL_MAP: Record<string, "claude-opus-4-6" | "claude-sonnet-4-6" | "claude-haiku-4-5-20251001"> = {
  opus: "claude-opus-4-6",
  sonnet: "claude-sonnet-4-6",
  haiku: "claude-haiku-4-5-20251001",
};

export async function POST() {
  try {
    // 1 — upsert the default org
    const existing = await db.query.orgs.findFirst({
      where: eq(schema.orgs.id, DEFAULT_ORG_ID),
    });

    if (!existing) {
      await db.insert(schema.orgs).values({
        id: DEFAULT_ORG_ID,
        name: "Agent Imperie",
        slug: "agent-imperie",
      });
    }

    // 2 — upsert all agents from the registry
    let created = 0;
    let skipped = 0;

    for (const [slug, agent] of Object.entries(REGISTRY)) {
      const def = agent.definition;
      const agentName = slug.charAt(0).toUpperCase() + slug.slice(1);

      const exists = await db.query.agents.findFirst({
        where: eq(schema.agents.name, agentName),
      });

      if (exists) {
        skipped++;
        continue;
      }

      await db.insert(schema.agents).values({
        orgId: DEFAULT_ORG_ID,
        name: agentName,
        department: def.department,
        role: def.role,
        model: MODEL_MAP[def.model] ?? "claude-sonnet-4-6",
        description: def.description,
        systemPrompt: def.systemPrompt,
        schedule: def.schedule ?? null,
        status: "idle",
        enabled: true,
      });
      created++;
    }

    return NextResponse.json({
      ok: true,
      orgId: DEFAULT_ORG_ID,
      created,
      skipped,
      total: created + skipped,
    });
  } catch (err) {
    console.error("[seed] Error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
