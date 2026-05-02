import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["pending", "reviewed", "implemented", "dismissed"] as const;
type ProposalStatus = typeof VALID_STATUSES[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as { status: string };

    if (!VALID_STATUSES.includes(body.status as ProposalStatus)) {
      return NextResponse.json(
        { error: `Ugyldig status. Gyldige: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const updated = await db
      .update(schema.strategyProposals)
      .set({ status: body.status })
      .where(
        and(
          eq(schema.strategyProposals.id, id),
          eq(schema.strategyProposals.orgId, DEFAULT_ORG_ID)
        )
      )
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "Forslag ikke funnet" }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
