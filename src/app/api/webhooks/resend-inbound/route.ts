/**
 * Resend Inbound Email Webhook
 *
 * Resend POSTer til dette endepunktet når noen svarer til replies@svarai.no.
 * Vi parser svaret, matcher det til et lead, lagrer det i DB og trigger Titan.
 *
 * Konfigurasjon i Resend:
 * 1. Domain → svarai.no → Inbound → aktiver
 * 2. Routing: replies.svarai.no → POST https://agent-imperie.vercel.app/api/webhooks/resend-inbound
 * 3. MX record: replies.svarai.no → inbound.resend.com (prio 10)
 * 4. Sett RESEND_WEBHOOK_SECRET i Vercel env → kopier fra Resend dashboard
 *
 * Resend sender headers som Array<{name, value}>, IKKE flat objekt.
 * Payload kan komme enten direkte eller pakket i { type, data: {...} }.
 */

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";
import { inngest } from "@/lib/inngest/client";

export const dynamic = "force-dynamic";

// Resend sends headers as an array of {name, value} pairs
interface ResendHeader {
  name: string;
  value: string;
}

// The actual email data — same shape whether wrapped or direct
interface ResendEmailData {
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  // Resend inbound: headers is ARRAY, not object
  headers?: ResendHeader[] | Record<string, string>;
  messageId?: string;
}

// Resend may wrap in an event envelope
interface ResendWebhookEnvelope {
  type?: string;
  created_at?: string;
  data?: ResendEmailData;
  // Or fields directly at root (older format)
  from?: string;
  to?: string | string[];
  subject?: string;
  text?: string;
  html?: string;
  headers?: ResendHeader[] | Record<string, string>;
}

export async function POST(req: NextRequest) {
  try {
    // Optional: verify shared secret if configured
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (secret) {
      const incoming = req.headers.get("x-resend-signature") ?? req.headers.get("authorization");
      if (!incoming || !incoming.includes(secret)) {
        console.warn("[resend-inbound] Ugyldig webhook-signatur");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const raw = await req.json() as ResendWebhookEnvelope;

    // Log raw payload in dev for debugging
    if (process.env.NODE_ENV !== "production") {
      console.log("[resend-inbound] Raw payload:", JSON.stringify(raw, null, 2));
    }

    // Unwrap envelope if present
    const email: ResendEmailData = raw.data ?? (raw as ResendEmailData);

    if (!email.from) {
      console.error("[resend-inbound] Mangler 'from' i payload", raw);
      // Return 200 so Resend doesn't retry — log and move on
      return NextResponse.json({ ok: true, warning: "no_from_field" });
    }

    const fromEmail = extractEmail(email.from);
    const subject = email.subject ?? "(uten emne)";
    const body = email.text ?? stripHtml(email.html ?? "");

    // Extract X-Lead-Id from headers — handles both array and flat-object formats
    const leadId = extractHeader(email.headers, "x-lead-id");

    // Find matching lead by email if no explicit lead ID
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

    // Log inbound email to DB
    await db.insert(schema.outreachEmails).values({
      orgId: DEFAULT_ORG_ID,
      leadId: matchedLeadId,
      direction: "inbound",
      fromEmail,
      toEmail: Array.isArray(email.to) ? email.to[0] : (email.to ?? "replies@svarai.no"),
      subject,
      body,
      sentAt: new Date(),
    });

    // Bump lead to "replied" only if currently contacted/no_reply
    if (matchedLeadId) {
      const lead = await db.query.leads.findFirst({
        where: eq(schema.leads.id, matchedLeadId),
        columns: { status: true },
      });
      const bumpable = ["contacted", "no_reply", "new"];
      if (lead && bumpable.includes(lead.status)) {
        await db
          .update(schema.leads)
          .set({ status: "replied", updatedAt: new Date() })
          .where(eq(schema.leads.id, matchedLeadId));
      }
    }

    // Fire event — Titan picks this up and crafts a response
    await inngest.send({
      name: "email/reply.received",
      data: {
        fromEmail,
        subject,
        body,
        leadId: matchedLeadId,
      },
    });

    console.log(`[resend-inbound] Behandlet svar fra ${fromEmail}, leadId=${matchedLeadId}`);
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("[resend-inbound] Feil:", err);
    // Return 200 to avoid Resend retry storm on persistent errors
    return NextResponse.json({ ok: false, error: String(err) });
  }
}

/** Extract a header value from either array or flat-object format */
function extractHeader(
  headers: ResendHeader[] | Record<string, string> | undefined,
  name: string
): string | null {
  if (!headers) return null;
  const lower = name.toLowerCase();
  if (Array.isArray(headers)) {
    return headers.find((h) => h.name.toLowerCase() === lower)?.value ?? null;
  }
  // Flat object — case-insensitive key lookup (JS keys are case-sensitive)
  const entry = Object.entries(headers).find(([k]) => k.toLowerCase() === lower);
  return entry?.[1] ?? null;
}

function extractEmail(from: string): string {
  const match = from.match(/<(.+?)>/) ?? from.match(/([^\s]+@[^\s]+)/);
  return (match?.[1] ?? from).toLowerCase().trim();
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
