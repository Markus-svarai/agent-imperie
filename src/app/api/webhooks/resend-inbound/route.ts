import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";
import { inngest } from "@/lib/inngest/client";

export const dynamic = "force-dynamic";

interface ResendHeader {
  name: string;
  value: string;
}

interface ResendEmailData {
  from?: string;
  to?: string | string[];
  subject?: string;
  text?: string;
  html?: string;
  headers?: ResendHeader[] | Record<string, string>;
}

interface ResendWebhookPayload {
  type?: string;
  data?: ResendEmailData;
  from?: string;
  to?: string | string[];
  subject?: string;
  text?: string;
  html?: string;
  headers?: ResendHeader[] | Record<string, string>;
}

export async function POST(req: NextRequest) {
  // Always return 200 to Resend — never let it retry
  let fromEmail = "unknown";
  let matchedLeadId: string | null = null;

  try {
    const raw = await req.json() as ResendWebhookPayload;
    console.log("[resend-inbound] payload type:", raw.type ?? "flat");

    // Ignore non-email events
    if (raw.type && raw.type !== "email.received") {
      console.log("[resend-inbound] skipping event type:", raw.type);
      return NextResponse.json({ ok: true, skipped: raw.type });
    }

    // Unwrap envelope or use flat format
    const email: ResendEmailData = raw.data ?? raw;

    // Diagnostic: log ALL top-level keys in raw + data to find where body lives
    console.log("[resend-inbound] raw keys:", Object.keys(raw));
    if (raw.data) console.log("[resend-inbound] data keys:", Object.keys(raw.data));
    console.log("[resend-inbound] felt:", {
      from: email.from,
      subject: JSON.stringify(email.subject),
      textLen: email.text?.length ?? "undef",
      htmlLen: email.html?.length ?? "undef",
      hasHeaders: !!email.headers,
      // Check for non-standard body fields Resend might use
      hasBody: "body" in email,
      hasContent: "content" in email,
      hasRaw: "raw" in (raw as Record<string, unknown>),
    });

    if (!email?.from) {
      console.warn("[resend-inbound] mangler from-felt — ignorerer");
      return NextResponse.json({ ok: true, warning: "no_from" });
    }

    fromEmail = extractEmail(email.from);
    // Use || not ?? — catches empty strings in addition to null/undefined
    const subject = email.subject || "(uten emne)";
    const body = (email.text || stripHtml(email.html || "")).slice(0, 2000);
    const leadId = extractHeader(email.headers, "x-lead-id");

    console.log(`[resend-inbound] fra=${fromEmail} emne="${subject}" bodyLen=${body.length} leadId=${leadId}`);

    // DB: match lead
    matchedLeadId = leadId;
    if (!matchedLeadId) {
      try {
        const lead = await db.query.leads.findFirst({
          where: and(
            eq(schema.leads.orgId, DEFAULT_ORG_ID),
            eq(schema.leads.email, fromEmail)
          ),
        });
        matchedLeadId = lead?.id ?? null;
      } catch (dbErr) {
        console.error("[resend-inbound] DB lead-lookup feil:", dbErr);
      }
    }

    // DB: log inbound email (non-blocking)
    try {
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
    } catch (dbErr) {
      console.error("[resend-inbound] DB insert feil:", dbErr);
      // Continue — still want to trigger Titan
    }

    // DB: bump lead status (non-blocking)
    if (matchedLeadId) {
      try {
        const lead = await db.query.leads.findFirst({
          where: eq(schema.leads.id, matchedLeadId),
          columns: { status: true },
        });
        if (lead && ["contacted", "no_reply", "new"].includes(lead.status)) {
          await db
            .update(schema.leads)
            .set({ status: "replied", updatedAt: new Date() })
            .where(eq(schema.leads.id, matchedLeadId));
          console.log(`[resend-inbound] lead ${matchedLeadId} → replied`);
        }
      } catch (dbErr) {
        console.error("[resend-inbound] DB status-bump feil:", dbErr);
      }
    }

    // Trigger Titan — separate try/catch so DB errors never block this
    const eventPayload = { from: fromEmail, subject, text: body, leadId: matchedLeadId };
    console.log("SENDER TIL INNGEST", eventPayload);
    try {
      await inngest.send({
        name: "email.received",
        data: eventPayload,
      });
      console.log("SENDT TIL INNGEST OK");
    } catch (inngestErr) {
      console.error("INNGEST SEND FEIL", inngestErr);
    }

    return NextResponse.json({ ok: true, from: fromEmail, leadId: matchedLeadId });

  } catch (err) {
    console.error("[resend-inbound] Uventet feil:", err);
    return NextResponse.json({ ok: false, error: String(err) });
  }
}

function extractHeader(
  headers: ResendHeader[] | Record<string, string> | undefined,
  name: string
): string | null {
  if (!headers) return null;
  const lower = name.toLowerCase();
  if (Array.isArray(headers)) {
    return headers.find((h) => h.name.toLowerCase() === lower)?.value ?? null;
  }
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
