/**
 * POST /api/command
 * Kjør en agent direkte fra dashboardet med en egendefinert melding.
 */

import { NextRequest, NextResponse } from "next/server";
import { makeCtx } from "@/lib/inngest/utils";
import { NovaAgent } from "@/lib/agents/nova";
import { HermesAgent } from "@/lib/agents/hermes";
import { TitanAgent, PulseAgent } from "@/lib/agents/sales";
import { JarvisAgent } from "@/lib/agents/jarvis";
import { AthenaAgent } from "@/lib/agents/command";

export const maxDuration = 60;

const AGENTS: Record<string, () => { run: (input: { message: string }, ctx: ReturnType<typeof makeCtx>["ctx"]) => Promise<unknown> }> = {
  nova: () => new NovaAgent(),
  hermes: () => new HermesAgent(),
  titan: () => new TitanAgent(),
  pulse: () => new PulseAgent(),
  jarvis: () => new JarvisAgent(),
  athena: () => new AthenaAgent(),
};

export async function POST(req: NextRequest) {
  try {
    const { agentName, message } = await req.json() as { agentName: string; message: string };

    if (!agentName || !message) {
      return NextResponse.json({ error: "agentName og message er påkrevd" }, { status: 400 });
    }

    const factory = AGENTS[agentName.toLowerCase()];
    if (!factory) {
      return NextResponse.json({ error: `Ukjent agent: ${agentName}` }, { status: 400 });
    }

    const agent = factory();
    const { ctx, runId, persistRun } = makeCtx(agentName.toLowerCase());

    console.log(`[command] Kjører ${agentName} med melding: "${message.slice(0, 80)}"`);

    const output = await (agent as unknown as { run: (input: { message: string }, ctx: typeof ctx) => Promise<{ summary: string; usage?: { inputTokens: number; outputTokens: number }; artifacts?: unknown[] }> }).run({ message }, ctx);

    await persistRun(output, "manual");

    return NextResponse.json({ ok: true, runId, output });
  } catch (err) {
    console.error("[command] Feil:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
