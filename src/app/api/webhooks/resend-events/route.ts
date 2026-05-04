/**
 * Resend event webhook — håndterer bounce og complaint events.
 *
 * Resend sender dette til: POST /api/webhooks/resend-events
 * Konfigurer i Resend dashboard → Webhooks → Add endpoint
 * Events å abonnere på: email.bounced, email.complained
 *
 * Bounce  → lead.status = "bounced"   (aldri kontaktes igjen)
 * Complaint → lead.status = "unsubscribed" (spam-rapport)
 */

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";

export const dynamic = "force-dynamic";

interface ResendEventData {
  email_id?: string;
  from?: string;
  to?: string[];
  subject?: string;
}

interface ResendEventPayload {
  type?: string;
  created_at?: string;
  data?: ResendEventData;
}

export async function POST(req: NextRequest) {
  // Always return 200 — never let Resend retry on our errors
  try {
    const raw = (await req.json()) as ResendEventPayload;
    const { type, data } = raw;

    console.log(`[resend-events] type=${type} email_id=${data?.email_id}`);

    if (!type || !data) {
      return NextResponse.json({ ok: true, skipped: "no_type_or_data" });
    }

    if (type !== "email.bounced" && type !== "email.complained") {
      // Ignore opens, clicks, deliveries etc.
      return NextResponse.json({ ok: true, skipped: type });
    }

    const toEmail = data.to?.[0]?.toLowerCase().trim();
    const resendMessageId = data.email_id;

    if (!toEmail && !resendMessageId) {
      console.warn("[resend-events] ingen to-adresse eller message_id — ignorerer");
      return NextResponse.json({ ok: true, skipped: "no_identifier" });
    }

    const newStatus = type === "email.bounced" ? "bounced" : "unsubscribed";

    // ── Finn lead via resend_message_id eller e-postadresse ──────────────────

    let leadId: string | null = null;

    // 1. Prøv via message_id i outreach_emails-tabellen (mest presis)
    if (resendMessageId) {
      const email = await db.query.outreachEmails.findFirst({
        where: and(
          eq(schema.outreachEmails.orgId, DEFAULT_ORG_ID),
          eq(schema.outreachEmails.resendMessageId, resendMessageId)
        ),
        columns: { leadId: true },
      });
      leadId = email?.leadId ?? null;
    }

    // 2. Fallback: søk på e-postadresse direkte i leads-tabellen
    if (!leadId && toEmail) {
      const lead = await db.query.leads.findFirst({
        where: and(
          eq(schema.leads.orgId, DEFAULT_ORG_ID),
          eq(schema.leads.email, toEmail)
        ),
        columns: { id: true, status: true },
      });
      leadId = lead?.id ?? null;
    }

    if (!leadId) {
      console.warn(`[resend-events] ingen lead funnet for ${toEmail ?? resendMessageId}`);
      return NextResponse.json({ ok: true, warning: "no_lead_found", toEmail });
    }

    // ── Oppdater lead-status ─────────────────────────────────────────────────

    await db
      .update(schema.leads)
      .set({
        status: newStatus as typeof schema.leads.$inferSelect.status,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.leads.id, leadId),
          eq(schema.leads.orgId, DEFAULT_ORG_ID)
        )
      );

    console.log(`[resend-events] lead ${leadId} → ${newStatus} (${type}, ${toEmail})`);

    return NextResponse.json({ ok: true, leadId, newStatus, type });

  } catch (err) {
    console.error("[resend-events] Uventet feil:", err);
    // Returner 200 uansett — vi vil ikke at Resend skal retry
    return NextResponse.json({ ok: false, error: String(err) });
  }
}
