import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";
import { checkAuth } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = checkAuth(req);
  if (authError) return authError;

  const body = await req.json() as Record<string, unknown>;

  // Whitelist oppdaterbare felter
  const allowed = ["phone", "email", "contactName", "notes", "status", "fitScore"] as const;
  const update: Partial<typeof schema.leads.$inferInsert> = {};

  for (const key of allowed) {
    if (key in body) {
      (update as Record<string, unknown>)[key] = body[key];
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Ingen gyldige felter" }, { status: 400 });
  }

  update.updatedAt = new Date();

  await db
    .update(schema.leads)
    .set(update)
    .where(
      and(
        eq(schema.leads.id, params.id),
        eq(schema.leads.orgId, DEFAULT_ORG_ID)
      )
    );

  return NextResponse.json({ ok: true });
}
