import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc, gte, and } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";
import { checkAuth } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const days = Math.min(Number(searchParams.get("days") ?? 7), 30);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  type FeedItem = {
    id: string;
    type: "run" | "email_out" | "email_in" | "booking" | "bounce";
    title: string;
    detail: string;
    ts: string;
    status?: string;
    agent?: string;
  };

  const items: FeedItem[] = [];

  // ── Agent runs ────────────────────────────────────────────────────────────
  try {
    const runs = await db
      .select({
        id: schema.agentRuns.id,
        status: schema.agentRuns.status,
        startedAt: schema.agentRuns.startedAt,
        output: schema.agentRuns.output,
        agentName: schema.agents.name,
      })
      .from(schema.agentRuns)
      .leftJoin(schema.agents, eq(schema.agentRuns.agentId, schema.agents.id))
      .where(
        and(
          eq(schema.agentRuns.orgId, DEFAULT_ORG_ID),
          gte(schema.agentRuns.startedAt, cutoff)
        )
      )
      .orderBy(desc(schema.agentRuns.startedAt))
      .limit(50);

    for (const r of runs) {
      const summary = (r.output as Record<string, unknown>)?.summary as string ?? "";
      items.push({
        id: r.id,
        type: "run",
        title: `${r.agentName ?? "Agent"} kjørte`,
        detail: summary ? summary.slice(0, 120) : "Ingen sammendrag",
        ts: r.startedAt?.toISOString() ?? new Date().toISOString(),
        status: r.status,
        agent: r.agentName ?? undefined,
      });
    }
  } catch { /* ignore */ }

  // ── Outbound emails ───────────────────────────────────────────────────────
  try {
    const emails = await db
      .select({
        id: schema.outreachEmails.id,
        direction: schema.outreachEmails.direction,
        toEmail: schema.outreachEmails.toEmail,
        fromEmail: schema.outreachEmails.fromEmail,
        subject: schema.outreachEmails.subject,
        sentAt: schema.outreachEmails.sentAt,
      })
      .from(schema.outreachEmails)
      .where(
        and(
          eq(schema.outreachEmails.orgId, DEFAULT_ORG_ID),
          gte(schema.outreachEmails.sentAt, cutoff)
        )
      )
      .orderBy(desc(schema.outreachEmails.sentAt))
      .limit(50);

    for (const e of emails) {
      if (e.direction === "outbound") {
        items.push({
          id: e.id,
          type: "email_out",
          title: `Hermes sendte til ${e.toEmail}`,
          detail: e.subject,
          ts: e.sentAt?.toISOString() ?? new Date().toISOString(),
          agent: "Hermes",
        });
      } else {
        items.push({
          id: e.id,
          type: "email_in",
          title: `Svar mottatt fra ${e.fromEmail}`,
          detail: e.subject,
          ts: e.sentAt?.toISOString() ?? new Date().toISOString(),
        });
      }
    }
  } catch { /* ignore */ }

  // ── SvarAI bookings ───────────────────────────────────────────────────────
  try {
    const bookings = await db
      .select({
        id: schema.svaraiBookings.id,
        clinicId: schema.svaraiBookings.clinicId,
        serviceName: schema.svaraiBookings.serviceName,
        date: schema.svaraiBookings.date,
        time: schema.svaraiBookings.time,
        name: schema.svaraiBookings.name,
        status: schema.svaraiBookings.status,
        createdAt: schema.svaraiBookings.createdAt,
      })
      .from(schema.svaraiBookings)
      .where(gte(schema.svaraiBookings.createdAt, cutoff))
      .orderBy(desc(schema.svaraiBookings.createdAt))
      .limit(30);

    for (const b of bookings) {
      items.push({
        id: b.id,
        type: "booking",
        title: `Ny booking via SvarAI`,
        detail: `${b.name} — ${b.serviceName ?? "time"} ${b.date} kl. ${b.time} (${b.clinicId})`,
        ts: b.createdAt?.toISOString() ?? new Date().toISOString(),
        status: b.status,
      });
    }
  } catch { /* ignore */ }

  // Sort all items by timestamp desc
  items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  return NextResponse.json({ items: items.slice(0, 100) });
}
