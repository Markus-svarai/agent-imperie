import { NextRequest, NextResponse } from "next/server";
import { REGISTRY } from "@/lib/agents/registry";
import { makeCtx, dagsDato } from "@/lib/inngest/utils";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agent = REGISTRY[id];

  if (!agent) {
    return NextResponse.json({ error: `Agent ikke funnet: ${id}` }, { status: 404 });
  }

  const { ctx, runId, logs, persistRun } = makeCtx(id);

  try {
    const output = await agent.run(
      {
        message: `Manuell trigger fra Agent Imperiet-dashboard. Dato: ${dagsDato()}. Lever din rapport eller utfør oppgaven din som normalt.`,
      },
      ctx
    );

    await persistRun(output, "manual");

    return NextResponse.json({
      ok: true,
      runId,
      summary: output.summary,
      usage: output.usage,
    });
  } catch (err) {
    console.error(`[trigger] ${id} feilet:`, err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
