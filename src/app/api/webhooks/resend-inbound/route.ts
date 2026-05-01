/**
 * Resend Inbound Email Webhook
 *
 * Resend sender en POST til denne endepunktet når noen svarer til replies@svarai.no.
 * Vi parser svaret, matcher det til et lead, lagrer det i DB og trigger Titan via Inngest.
 *
 * Konfigurasjon i Resend:
 * 1. Domain → svarai.no → Inbound → aktiver
 * 2. Routing: replies.svarai.no → POST https://agent-imperie.vercel.app/api/webhooks/resend-inbound
 * 3. MX record: replies.svarai.no → inbound.resend.com (prio 10)
 */

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";
import { inngest } from "@/lib/inngest/client";

export const dynamic = "force-dynamic";

interface ResendInboundPayload {
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json() as ResendInboundPayload;

    const fromEmail = extractEmail(payload.from);
    const subject = payload.subject ?? "(uten emne)";
    const body = payload.text ?? stripHtml(payload.html ?? "");
    const leadId = payload.headers?.["x-lead-id"] ?? null;

    // Find matching lead by email
    let matchedLeadId = leadId;
    if (!matchedLeadId && fromEmail) {
      const lead = await db.query.leads.findFirst({
        where: and(
          eq(schema.leads.orgId, DEFAULT_ORG_ID),
          eq(schema.leads.email, fromEmail)
        ),
      });
      matchedLeadId = lead?.id ?? null;
    }

    // Store the inbound email
    await db.insert(schema.outreachEmails).values({
      orgId: DEFAULT_ORG_ID,
      leadId: matchedLeadId,
      direction: "inbound",
      fromEmail,
      toEmail: "replies@svarai.no",
      subject,
      body,
      sentAt: new Date(),
    });

    // Update lead status to "replied"
    if (matchedLeadId) {
      await db
        .update(schema.leads)
        .set({ status: "replied", updatedAt: new Date() })
        .where(eq(schema.leads.id, matchedLeadId));
    }

    // Trigger Titan to respond
    await inngest.send({
      name: "email/reply.received",
      data: {
        fromEmail,
        subject,
        body,
        leadId: matchedLeadId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[resend-inbound] Feil:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function extractEmail(from: string): string {
  const match = from.match(/<(.+?)>/) ?? from.match(/([^\s]+@[^\s]+)/);
  return match?.[1] ?? from;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
