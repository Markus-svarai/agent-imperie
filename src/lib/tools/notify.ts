/**
 * notify — send interne statusvarsler til Markus via Resend.
 * Disse er ikke outreach — de er operasjonelle oppdateringer fra agentene.
 */

const MARKUS_EMAIL = process.env.MARKUS_EMAIL ?? "Markus08aasheim@gmail.com";
const FROM_EMAIL = process.env.NOTIFY_FROM_EMAIL ?? "hei@svarai.no";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://agentimperie.vercel.app";

export interface NotifyInput {
  subject: string;
  agentName: string;
  agentColor: string; // hex farge
  body: string;       // plain text, kan ha newlines
  runId?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export async function notifyMarkus(input: NotifyInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[notify] RESEND_API_KEY ikke satt — hopper over varsel");
    return;
  }

  const html = buildNotificationHtml(input);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${input.agentName} · Agent Imperie <${FROM_EMAIL}>`,
        to: MARKUS_EMAIL,
        subject: input.subject,
        html,
        text: input.body,
      }),
    });

    if (!res.ok) {
      const data = await res.json() as { message?: string };
      console.error(`[notify] Resend feil: ${data.message ?? res.status}`);
    } else {
      console.log(`[notify] Varsel sendt: ${input.subject}`);
    }
  } catch (err) {
    console.error("[notify] Kunne ikke sende varsel:", err);
  }
}

function buildNotificationHtml(input: NotifyInput): string {
  const paragraphs = input.body
    .split("\n")
    .filter((p) => p.trim())
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6;color:#333;">${p}</p>`)
    .join("");

  const cta = input.ctaLabel && input.ctaUrl
    ? `<div style="margin-top:20px;">
        <a href="${input.ctaUrl}" style="display:inline-block;padding:10px 20px;background:${input.agentColor};color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">${input.ctaLabel} →</a>
      </div>`
    : "";

  const runInfo = input.runId
    ? `<p style="margin:16px 0 0;font-size:12px;color:#999;">Run ID: ${input.runId}</p>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;">
  <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="padding:20px 28px;background:${input.agentColor};display:flex;align-items:center;gap:12px;">
      <div>
        <div style="font-size:16px;font-weight:600;color:#fff;">${input.agentName}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:2px;">Agent Imperie · Operasjonsrapport</div>
      </div>
    </div>
    <div style="padding:28px;">
      <h2 style="margin:0 0 20px;font-size:18px;font-weight:600;color:#111;">${input.subject}</h2>
      ${paragraphs}
      ${cta}
      ${runInfo}
    </div>
    <div style="padding:16px 28px;border-top:1px solid #eee;font-size:12px;color:#999;display:flex;justify-content:space-between;">
      <span>Agent Imperie</span>
      <a href="${APP_URL}/runs" style="color:#0066cc;text-decoration:none;">Se alle kjøringer →</a>
    </div>
  </div>
</body>
</html>`;
}
