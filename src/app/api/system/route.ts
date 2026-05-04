import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";
import { checkAuth } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const org = await db.query.orgs.findFirst({
    where: eq(schema.orgs.id, DEFAULT_ORG_ID),
    columns: { systemEnabled: true },
  });
  return NextResponse.json({ systemEnabled: org?.systemEnabled ?? true });
}

export async function PATCH(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  const body = await req.json() as { systemEnabled: boolean };
  await db
    .update(schema.orgs)
    .set({ systemEnabled: body.systemEnabled })
    .where(eq(schema.orgs.id, DEFAULT_ORG_ID));
  console.log(`[system] Kill switch → ${body.systemEnabled ? "ENABLED" : "DISABLED"}`);
  return NextResponse.json({ systemEnabled: body.systemEnabled });
}
