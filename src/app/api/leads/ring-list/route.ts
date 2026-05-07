import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { and, eq, gte, isNotNull, isNull, desc } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Leads med 2+ e-poster og ingen svar — klare for manuell ring
    const allLeads = await db.query.leads.findMany({
      where: and(
        eq(schema.leads.orgId, DEFAULT_ORG_ID),
        gte(schema.leads.outreachCount, 2),
      ),
      orderBy: [desc(schema.leads.lastContactedAt)],
    });

    const pending = allLeads
      .filter((l) => !l.calledAt)
      .map(mapLead);

    const called = allLeads
      .filter((l) => !!l.calledAt)
      .map(mapLead);

    return NextResponse.json({ pending, called });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function mapLead(l: typeof schema.leads.$inferSelect) {
  return {
    id: l.id,
    companyName: l.companyName,
    contactName: l.contactName ?? null,
    phone: l.phone ?? null,
    email: l.email ?? null,
    specialty: l.specialty ?? null,
    location: l.location ?? null,
    outreachCount: l.outreachCount,
    lastContactedAt: l.lastContactedAt?.toISOString() ?? null,
    calledAt: l.calledAt?.toISOString() ?? null,
    status: l.status,
  };
}
