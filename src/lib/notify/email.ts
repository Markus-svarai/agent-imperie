/**
 * Email delivery via Resend REST API.
 *
 * Configure RESEND_API_KEY and DIGEST_EMAIL in environment variables.
 * If RESEND_API_KEY is not set, all calls are silently no-ops.
 */

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[sendEmail] RESEND_API_KEY ikke satt — hopper over e-post");
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Agent Imperiet <imperiet@agentimperie.no>",
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[sendEmail] Resend feil:", err);
    }
  } catch (err) {
    console.error("[sendEmail] Feil:", err);
  }
}

/** Build a daily digest HTML email */
export function buildDigestEmail(
  runs: Array<{
    agentName: string;
    department: string;
    status: string;
    durationMs: number | null;
    inputTokens: number;
    outputTokens: number;
    costMicroUsd: number;
    summary: string;
    startedAt: string | null;
  }>,
  date: string
): string {
  const totalRuns = runs.length;
  const completed = runs.filter((r) => r.status === "completed").length;
  const totalTokens = runs.reduce((s, r) => s + r.inputTokens + r.outputTokens, 0);
  const totalCostUsd = runs.reduce((s, r) => s + r.costMicroUsd, 0) / 1_000_000;

  const runRows = runs
    .map(
      (r) => `
      <tr style="border-bottom:1px solid #2a2a2a;">
        <td style="padding:10px 12px;font-weight:600;color:#e5e5e5;">${r.agentName}</td>
        <td style="padding:10px 12px;color:#888;text-transform:capitalize;">${r.department}</td>
        <td style="padding:10px 12px;color:${r.status === "completed" ? "#4ade80" : "#f87171"};">
          ${r.status === "completed" ? "✅" : "❌"} ${r.status}
        </td>
        <td style="padding:10px 12px;color:#888;">${r.durationMs ? (r.durationMs / 1000).toFixed(1) + "s" : "—"}</td>
        <td style="padding:10px 12px;color:#888;">${(r.inputTokens + r.outputTokens).toLocaleString("nb-NO")}</td>
        <td style="padding:10px 12px;color:#aaa;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          ${r.summary.slice(0, 120)}
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Agent Imperiet Digest</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e5e5;">
  <div style="max-width:900px;margin:40px auto;padding:0 20px;">

    <!-- Header -->
    <div style="border-bottom:1px solid #222;padding-bottom:24px;margin-bottom:32px;">
      <div style="font-size:11px;color:#666;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">Agent Imperiet</div>
      <h1 style="margin:0;font-size:24px;font-weight:600;color:#f5f5f5;">Daglig digest</h1>
      <p style="margin:6px 0 0;font-size:14px;color:#888;">${date}</p>
    </div>

    <!-- KPIs -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px;">
      ${[
        { label: "Kjøringer", value: String(totalRuns) },
        { label: "Fullført", value: `${completed}/${totalRuns}` },
        { label: "Tokens", value: totalTokens.toLocaleString("nb-NO") },
        { label: "Kostnad", value: `$${totalCostUsd.toFixed(4)}` },
      ]
        .map(
          (kpi) => `
        <div style="background:#111;border:1px solid #222;border-radius:8px;padding:16px;">
          <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">${kpi.label}</div>
          <div style="font-size:22px;font-weight:600;color:#f5f5f5;">${kpi.value}</div>
        </div>`
        )
        .join("")}
    </div>

    <!-- Runs table -->
    <div style="background:#111;border:1px solid #222;border-radius:8px;overflow:hidden;">
      <div style="padding:16px 20px;border-bottom:1px solid #222;">
        <h2 style="margin:0;font-size:14px;font-weight:600;">Kjøringer i dag</h2>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#161616;border-bottom:1px solid #2a2a2a;">
            <th style="padding:10px 12px;text-align:left;color:#666;font-weight:500;font-size:11px;text-transform:uppercase;">Agent</th>
            <th style="padding:10px 12px;text-align:left;color:#666;font-weight:500;font-size:11px;text-transform:uppercase;">Avd.</th>
            <th style="padding:10px 12px;text-align:left;color:#666;font-weight:500;font-size:11px;text-transform:uppercase;">Status</th>
            <th style="padding:10px 12px;text-align:left;color:#666;font-weight:500;font-size:11px;text-transform:uppercase;">Tid</th>
            <th style="padding:10px 12px;text-align:left;color:#666;font-weight:500;font-size:11px;text-transform:uppercase;">Tokens</th>
            <th style="padding:10px 12px;text-align:left;color:#666;font-weight:500;font-size:11px;text-transform:uppercase;">Sammendrag</th>
          </tr>
        </thead>
        <tbody>${runRows}</tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #1a1a1a;text-align:center;">
      <p style="font-size:12px;color:#555;margin:0;">Agent Imperiet · agent-imperie.vercel.app</p>
    </div>

  </div>
</body>
</html>`;
}
