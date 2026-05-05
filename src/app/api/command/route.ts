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
import { makeCtx } from "@/lib/inngest/utils";
import { randomUUID } from "crypto";

export const maxDuration = 30;

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

    // Prøv å kjøre synkront innen 20s — fungerer for enkle spørsmål.
    // Fall tilbake til Inngest async for lange agenter som Hermes og Nova.
    const SYNC_TIMEOUT_MS = 20_000;

    const { ctx, runId, persistRun, persistError } = makeCtx(agentId);

    const syncRace = Promise.race([
      agent.run({ message }, ctx),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("sync-timeout")), SYNC_TIMEOUT_MS)
      ),
    ]);

    try {
      const output = await syncRace;
      await persistRun(output, "manual");
      console.log(`[command] Synkront svar fra ${agentName} — runId=${runId}`);
      return NextResponse.json({ ok: true, runId, output });
    } catch (err) {
      if (err instanceof Error && err.message === "sync-timeout") {
        // Agenten er treg — send til Inngest så Vercel ikke timer ut
        const asyncRunId = randomUUID();
        console.log(`[command] Timeout — sender ${agentName} til Inngest — runId=${asyncRunId}`);
        await inngest.send({
          name: "agent/command",
          data: { agentId, message, runId: asyncRunId },
        });
        return NextResponse.json({
          ok: true,
          queued: true,
          runId: asyncRunId,
          message: `${agentName} kjøres i bakgrunnen — sjekk kjøringer-siden for resultat.`,
        });
      }
      throw err;
    }
  } catch (err) {
    console.error("[command] Feil:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
