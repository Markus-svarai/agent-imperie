import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";
import { checkAuth } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const proposals = await db.query.strategyProposals.findMany({
      where: eq(schema.strategyProposals.orgId, DEFAULT_ORG_ID),
      orderBy: [desc(schema.strategyProposals.createdAt)],
      limit: 50,
    });
    return NextResponse.json(proposals);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
