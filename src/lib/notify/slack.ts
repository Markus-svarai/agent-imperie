/**
 * Slack Incoming Webhook sender.
 *
 * Configure SLACK_WEBHOOK_URL in environment variables.
 * If not set, all calls are silently no-ops.
 */

export interface SlackBlock {
  type: string;
  [key: string]: unknown;
}

export async function notifySlack(
  text: string,
  blocks?: SlackBlock[]
): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  // Guard: missing or placeholder value — skip silently
  if (!webhookUrl || !webhookUrl.startsWith("https://hooks.slack.com/")) {
    console.log("[notifySlack] Slack webhook ikke konfigurert, hopper over");
    return;
  }

  try {
    const body: Record<string, unknown> = { text };
    if (blocks?.length) body.blocks = blocks;

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[notifySlack] Feil:", err);
  }
}

/** Format a completed run notification */
export function runCompletedMessage(
  agentName: string,
  durationMs: number,
  inputTokens: number,
  outputTokens: number,
  summary: string,
  trigger: string
): { text: string; blocks: SlackBlock[] } {
  const durationSec = (durationMs / 1000).toFixed(1);
  const totalTokens = (inputTokens + outputTokens).toLocaleString("nb-NO");
  const triggerLabel = trigger === "manual" ? "Manuell" : trigger === "schedule" ? "Cron" : "Event";
  const shortSummary = summary.slice(0, 280) + (summary.length > 280 ? "…" : "");

  const text = `✅ *${agentName}* fullført (${triggerLabel} · ${durationSec}s · ${totalTokens} tokens)`;

  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `✅ *${agentName}* kjøring fullført`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `*Trigger:* ${triggerLabel}  |  *Tid:* ${durationSec}s  |  *Tokens:* ${totalTokens}`,
        },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `> ${shortSummary.replace(/\n/g, "\n> ")}`,
      },
    },
    { type: "divider" },
  ];

  return { text, blocks };
}

/** Format an anomaly/error alert */
export function anomalyMessage(
  agentName: string,
  summary: string
): { text: string; blocks: SlackBlock[] } {
  const shortSummary = summary.slice(0, 400);
  const text = `⚠️ *${agentName}* oppdaget noe kritisk`;

  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `⚠️ *${agentName}* flagget et kritisk signal`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `> ${shortSummary.replace(/\n/g, "\n> ")}`,
      },
    },
    { type: "divider" },
  ];

  return { text, blocks };
}
