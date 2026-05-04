import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc, and, gte } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";
import { checkAuth } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const days = Math.min(Number(searchParams.get("days") ?? "30"), 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // ── 1. Outbound e-poster (hva Hermes har sendt) ──────────────────────────
  const outboundRows = await db
    .select({
      id: schema.outreachEmails.id,
      subject: schema.outreachEmails.subject,
      body: schema.outreachEmails.body,
      toEmail: schema.outreachEmails.toEmail,
      sentAt: schema.outreachEmails.sentAt,
      createdAt: schema.outreachEmails.createdAt,
      leadId: schema.outreachEmails.leadId,
      companyName: schema.leads.companyName,
      contactName: schema.leads.contactName,
      specialty: schema.leads.specialty,
      location: schema.leads.location,
      leadStatus: schema.leads.status,
    })
    .from(schema.outreachEmails)
    .leftJoin(schema.leads, eq(schema.outreachEmails.leadId, schema.leads.id))
    .where(
      and(
        eq(schema.outreachEmails.orgId, DEFAULT_ORG_ID),
        eq(schema.outreachEmails.direction, "outbound"),
        gte(schema.outreachEmails.createdAt, since)
      )
    )
    .orderBy(desc(schema.outreachEmails.createdAt));

  // Group outbound by date (day)
  const outboundByDay: Record<string, typeof outboundRows> = {};
  for (const row of outboundRows) {
    const day = (row.sentAt ?? row.createdAt)?.toISOString().slice(0, 10) ?? "ukjent";
    if (!outboundByDay[day]) outboundByDay[day] = [];
    outboundByDay[day].push(row);
  }

  // ── 2. Inbound e-poster (svar mottatt) ───────────────────────────────────
  const inboundRows = await db
    .select({
      id: schema.outreachEmails.id,
      subject: schema.outreachEmails.subject,
      fromEmail: schema.outreachEmails.fromEmail,
      body: schema.outreachEmails.body,
      sentAt: schema.outreachEmails.sentAt,
      createdAt: schema.outreachEmails.createdAt,
      leadId: schema.outreachEmails.leadId,
      companyName: schema.leads.companyName,
      contactName: schema.leads.contactName,
      specialty: schema.leads.specialty,
      location: schema.leads.location,
      leadStatus: schema.leads.status,
      fitScore: schema.leads.fitScore,
    })
    .from(schema.outreachEmails)
    .leftJoin(schema.leads, eq(schema.outreachEmails.leadId, schema.leads.id))
    .where(
      and(
        eq(schema.outreachEmails.orgId, DEFAULT_ORG_ID),
        eq(schema.outreachEmails.direction, "inbound")
      )
    )
    .orderBy(desc(schema.outreachEmails.createdAt));

  // ── 3. Leads som vil ha samtale (interested / demo_booked) ───────────────
  const hotLeads = await db
    .select({
      id: schema.leads.id,
      companyName: schema.leads.companyName,
      contactName: schema.leads.contactName,
      email: schema.leads.email,
      phone: schema.leads.phone,
      specialty: schema.leads.specialty,
      location: schema.leads.location,
      status: schema.leads.status,
      fitScore: schema.leads.fitScore,
      notes: schema.leads.notes,
      updatedAt: schema.leads.updatedAt,
    })
    .from(schema.leads)
    .where(
      and(
        eq(schema.leads.orgId, DEFAULT_ORG_ID),
        // interested or demo_booked
      )
    )
    .orderBy(desc(schema.leads.updatedAt));

  const wantCall = hotLeads.filter(
    (l) => l.status === "interested" || l.status === "demo_booked"
  );

  // ── 4. Ikke interessert ──────────────────────────────────────────────────
  const notInterested = hotLeads.filter((l) => l.status === "not_interested");

  // ── 5. Skeptiske / ingen svar ────────────────────────────────────────────
  const noReply = hotLeads.filter((l) => l.status === "no_reply");

  // ── 6. Pipeline snapshot ─────────────────────────────────────────────────
  const allLeads = await db
    .select({
      status: schema.leads.status,
      companyName: schema.leads.companyName,
      contactName: schema.leads.contactName,
      email: schema.leads.email,
      phone: schema.leads.phone,
      specialty: schema.leads.specialty,
      location: schema.leads.location,
      fitScore: schema.leads.fitScore,
      notes: schema.leads.notes,
      lastContactedAt: schema.leads.lastContactedAt,
      updatedAt: schema.leads.updatedAt,
    })
    .from(schema.leads)
    .where(eq(schema.leads.orgId, DEFAULT_ORG_ID))
    .orderBy(desc(schema.leads.fitScore), desc(schema.leads.updatedAt));

  const contacted = allLeads.filter((l) => l.status === "contacted");

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    days,
    outboundByDay,
    outboundTotal: outboundRows.length,
    inbound: inboundRows.map((r) => ({
      ...r,
      sentAt: r.sentAt?.toISOString() ?? null,
      createdAt: r.createdAt?.toISOString() ?? null,
    })),
    wantCall: wantCall.map((l) => ({
      ...l,
      updatedAt: l.updatedAt?.toISOString() ?? null,
    })),
    notInterested: notInterested.map((l) => ({
      ...l,
      updatedAt: l.updatedAt?.toISOString() ?? null,
    })),
    noReply: noReply.map((l) => ({
      ...l,
      updatedAt: l.updatedAt?.toISOString() ?? null,
    })),
    contacted: contacted.map((l) => ({
      ...l,
      lastContactedAt: l.lastContactedAt?.toISOString() ?? null,
      updatedAt: l.updatedAt?.toISOString() ?? null,
    })),
    outboundByDaySerialized: Object.fromEntries(
      Object.entries(outboundByDay).map(([day, rows]) => [
        day,
        rows.map((r) => ({
          ...r,
          sentAt: r.sentAt?.toISOString() ?? null,
          createdAt: r.createdAt?.toISOString() ?? null,
        })),
      ])
    ),
  });
}
