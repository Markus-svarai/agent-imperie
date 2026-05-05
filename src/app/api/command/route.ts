/**
 * GET  /api/command  → list all available agents (from REGISTRY ∩ DB)
 * POST /api/command  → run an agent with a custom message
 */

import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/api/auth";
import { REGISTRY } from "@/lib/agents/registry";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";
import { inngest } from "@/lib/inngest/client";
import { randomUUID } from "crypto";

/** GET /api/command — returns all agents registered in REGISTRY, enriched with DB metadata */
export async function GET(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const dbAgents = await db.query.agents.findMany({
      where: eq(schema.agents.orgId, DEFAULT_ORG_ID),
      columns: { id: true, name: true, department: true, description: true, model: true },
    });

    // Only expose agents that exist in both REGISTRY and DB
    const available = dbAgents
      .filter((a) => REGISTRY[a.name.toLowerCase()])
      .map((a) => ({
        id: a.name.toLowerCase(),
        name: a.name,
        department: a.department,
        description: a.description ?? "",
        model: a.model,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ agents: available });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const { agentName, message } = await req.json() as { agentName: string; message: string };

    if (!agentName || !message) {
      return NextResponse.json({ error: "agentName og message er påkrevd" }, { status: 400 });
    }

    const agentId = agentName.toLowerCase();
    const agent = REGISTRY[agentId];

    if (!agent) {
      const available = Object.keys(REGISTRY).sort().join(", ");
      return NextResponse.json(
        { error: `Ukjent agent: ${agentName}. Tilgjengelige: ${available}` },
        { status: 400 }
      );
    }

    // Fyr Inngest-event i stedet for å kjøre synkront.
    // Unngår Vercel 60s timeout for lange agenter som Hermes og Nova.
    const runId = randomUUID();
    console.log(`[command] Sender ${agentName} til Inngest — runId=${runId}`);

    await inngest.send({
      name: "agent/command",
      data: { agentId, message, runId },
    });

    return NextResponse.json({
      ok: true,
      queued: true,
      runId,
      message: `${agentName} er satt i gang. Se kjøringer-siden for resultat.`,
    });
  } catch (err) {
    console.error("[command] Feil:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
