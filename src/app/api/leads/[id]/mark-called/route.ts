import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await db
      .update(schema.leads)
      .set({ calledAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.leads.id, params.id), eq(schema.leads.orgId, DEFAULT_ORG_ID)));

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await db
      .update(schema.leads)
      .set({ calledAt: null, updatedAt: new Date() })
      .where(and(eq(schema.leads.id, params.id), eq(schema.leads.orgId, DEFAULT_ORG_ID)));

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
