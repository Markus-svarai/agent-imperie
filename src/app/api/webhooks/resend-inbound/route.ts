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
  // flat format fallback
  from?: string;
  to?: string | string[];
  subject?: string;
  text?: string;
  html?: string;
  headers?: ResendHeader[] | Record<string, string>;
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json() as ResendWebhookPayload;

    // Ignore non-email events
    if (raw.type && raw.type !== "email.received") {
      return NextResponse.json({ ok: true, skipped: raw.type });
    }

    // Unwrap envelope or use flat format
    const email: ResendEmailData = raw.data ?? raw;

    // Safety guards — always return 200 to Resend
    if (!email || !email.from) {
      console.warn("[resend-inbound] Mangler email.from — ignorerer");
      return NextResponse.json({ ok: true, warning: "no_from" });
    }

    const fromEmail = extractEmail(email.from);
    const subject = email.subject ?? "(uten emne)";
    const body = email.text ?? stripHtml(email.html ?? "");
    const leadId = extractHeader(email.headers, "x-lead-id");

    const parsed = { fromEmail, subject, body: body.slice(0, 500), leadId };
    console.log("[resend-inbound] received:", parsed);

    // Match lead by X-Lead-Id or sender email
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

    // Log inbound email
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

    // Bump lead status if currently contactable
    if (matchedLeadId) {
      const lead = await db.query.leads.findFirst({
        where: eq(schema.leads.id, matchedLeadId),
        columns: { status: true },
      });
      if (lead && ["contacted", "no_reply", "new"].includes(lead.status)) {
        await db
          .update(schema.leads)
          .set({ status: "replied", updatedAt: new Date() })
          .where(eq(schema.leads.id, matchedLeadId));
      }
    }

    // Trigger Titan via Inngest
    await inngest.send({
      name: "email/reply.received",
      data: {
        from: fromEmail,
        subject,
        text: body,
        leadId: matchedLeadId,
        raw: email,
      },
    });

    console.log("[resend-inbound] event sent to inngest");
    console.log(`[resend-inbound] OK — fra=${fromEmail} leadId=${matchedLeadId}`);
    return NextResponse.json({ ok: true });

  } catch (err) {
    // Never let Resend retry storm — always 200
    console.error("[resend-inbound] Feil:", err);
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
