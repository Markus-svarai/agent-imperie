/**
 * send-outreach — Hermes sitt e-postverktøy.
 *
 * Sender personlig outreach via Resend og logger alt i outreach_emails-tabellen.
 * Fra-adresse: hei@svarai.no (krever Resend domain-verifisering).
 */

import { db, schema } from "@/lib/db";
import { eq, and, gte, count } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";

const DAILY_OUTREACH_LIMIT = Number(process.env.DAILY_OUTREACH_LIMIT ?? "10");

const FROM_EMAIL = process.env.OUTREACH_FROM_EMAIL ?? "hei@svarai.no";
const FROM_NAME = process.env.OUTREACH_FROM_NAME ?? "Markus – SvarAI";
const CALENDLY_LINK = process.env.CALENDLY_LINK ?? "https://calendly.com/svarai/demo";

export interface SendOutreachInput {
  to: string;
  toName?: string;
  subject: string;
  body: string;
  leadId?: string;
}

export interface SendOutreachResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/** How many outbound emails were sent today */
export async function getDailyOutboundCount(): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const result = await db
    .select({ total: count() })
    .from(schema.outreachEmails)
    .where(
      and(
        eq(schema.outreachEmails.orgId, DEFAULT_ORG_ID),
        eq(schema.outreachEmails.direction, "outbound"),
        gte(schema.outreachEmails.sentAt, todayStart)
      )
    );
  return result[0]?.total ?? 0;
}

/** Send an outreach email via Resend */
export async function sendOutreachEmail(
  input: SendOutreachInput
): Promise<SendOutreachResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[sendOutreach] RESEND_API_KEY ikke satt");
    return { ok: false, error: "RESEND_API_KEY ikke konfigurert" };
  }

  // Rate limit: max N outbound emails per day
  const sentToday = await getDailyOutboundCount();
  if (sentToday >= DAILY_OUTREACH_LIMIT) {
    console.warn(`[sendOutreach] Daglig grense nådd (${sentToday}/${DAILY_OUTREACH_LIMIT})`);
    return {
      ok: false,
      error: `Daglig grense nådd: ${sentToday}/${DAILY_OUTREACH_LIMIT} e-poster sendt i dag. Prøv igjen i morgen.`,
    };
  }

  try {
    // Build HTML email
    const html = buildOutreachHtml(input.body, CALENDLY_LINK);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: input.to,
        reply_to: `replies@svarai.no`,
        subject: input.subject,
        html,
        text: input.body,
        headers: {
          "X-Lead-Id": input.leadId ?? "",
        },
      }),
    });

    const data = await res.json() as { id?: string; message?: string };

    if (!res.ok) {
      return { ok: false, error: data.message ?? "Ukjent Resend-feil" };
    }

    // Log in DB
    await db.insert(schema.outreachEmails).values({
      orgId: DEFAULT_ORG_ID,
      leadId: input.leadId ?? null,
      direction: "outbound",
      fromEmail: FROM_EMAIL,
      toEmail: input.to,
      subject: input.subject,
      body: input.body,
      resendMessageId: data.id,
      sentAt: new Date(),
    });

    // Update lead status to "contacted"
    if (input.leadId) {
      await db
        .update(schema.leads)
        .set({ status: "contacted", lastContactedAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.leads.id, input.leadId));
    }

    return { ok: true, messageId: data.id };
  } catch (err) {
    console.error("[sendOutreach] Feil:", err);
    return { ok: false, error: String(err) };
  }
}

/** Get leads pending reply (contacted but no reply within N days) */
export async function getPendingLeads(daysSinceContact = 3) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysSinceContact);

  return db.query.leads.findMany({
    where: (leads, { and, eq, lte }) =>
      and(
        eq(leads.orgId, DEFAULT_ORG_ID),
        eq(leads.status, "contacted"),
        lte(leads.lastContactedAt, cutoff)
      ),
    orderBy: (leads, { asc }) => [asc(leads.lastContactedAt)],
    limit: 10,
  });
}

/** Get leads that have replied and need Titan's attention */
export async function getRepliedLeads() {
  return db.query.leads.findMany({
    where: (leads, { and, eq }) =>
      and(
        eq(leads.orgId, DEFAULT_ORG_ID),
        eq(leads.status, "replied")
      ),
    with: { emails: true },
    orderBy: (leads, { desc }) => [desc(leads.updatedAt)],
    limit: 20,
  });
}

function buildOutreachHtml(body: string, calendlyLink: string): string {
  const paragraphs = body
    .split("\n")
    .filter((p) => p.trim())
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6;">${p}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;background:#fff;">
  <div style="max-width:600px;margin:40px auto;padding:0 24px;">
    ${paragraphs}
    <div style="margin-top:24px;padding:16px 20px;background:#f8f8f8;border-radius:8px;border-left:3px solid #0066cc;">
      <p style="margin:0 0 8px;font-size:14px;color:#555;">Vil du se SvarAI i aksjon?</p>
      <a href="${calendlyLink}" style="display:inline-block;padding:10px 20px;background:#0066cc;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">Book en gratis demo →</a>
    </div>
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #eee;font-size:12px;color:#999;">
      <p style="margin:0;">SvarAI · AI-resepsjonist for norske klinikker</p>
      <p style="margin:4px 0 0;"><a href="https://svarai.no" style="color:#0066cc;">svarai.no</a> · Svarer på hei@svarai.no</p>
    </div>
  </div>
</body>
</html>`;
}
