import { inngest } from "../client";
import { db, schema } from "@/lib/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";
import { sendEmail, buildDigestEmail } from "@/lib/notify/email";
import { notifySlack } from "@/lib/notify/slack";
import { dagsDato } from "../utils";

// ─── Deal-closed varsling ─────────────────────────────────────────────────────
// Når Titan booker en demo, send øyeblikkelig varsel til Markus

export const dealClosedVarsling = inngest.createFunction(
  { id: "deal-closed-varsling", name: "Notifications · Demo booket 🎉", retries: 2 },
  { event: "titan/deal.closed" },
  async ({ event, step }) => {
    const { companyName, specialty, location, leadId } = event.data as {
      companyName: string;
      specialty: string;
      location: string;
      leadId: string;
      closedAt: string;
    };

    const toEmail = process.env.DIGEST_EMAIL ?? "Markus08aasheim@gmail.com";

    await step.run("send-email-varsel", () =>
      sendEmail({
        to: toEmail,
        subject: `🎉 Demo booket: ${companyName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">🎉 Demo booket!</h1>
            <p style="font-size: 18px;"><strong>${companyName}</strong> har booket demo.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr><td style="padding: 8px; color: #666;">Klinikk</td><td style="padding: 8px; font-weight: bold;">${companyName}</td></tr>
              <tr style="background: #f9fafb;"><td style="padding: 8px; color: #666;">Type</td><td style="padding: 8px;">${specialty ?? "–"}</td></tr>
              <tr><td style="padding: 8px; color: #666;">Sted</td><td style="padding: 8px;">${location ?? "–"}</td></tr>
            </table>
            <p>Sjekk Calendly for tidspunkt. <a href="${process.env.CALENDLY_LINK ?? "https://calendly.com/svarai/demo"}">Åpne Calendly →</a></p>
          </div>
        `,
      })
    );

    // Also ping Slack if configured
    await step.run("slack-ping", async () => {
      await notifySlack(
        `🎉 Demo booket! *${companyName}* (${specialty}, ${location}) har takket ja til pilot-demo.`,
        [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `🎉 *Demo booket!*\n*${companyName}* — ${specialty}, ${location}\nLead ID: \`${leadId}\``,
            },
          },
        ]
      );
    });

    return { notified: true, companyName };
  }
);

// ─── Daily email digest (20:00 every day) ────────────────────────────────────

export const dailyDigest = inngest.createFunction(
  { id: "daily-digest", name: "Notifications · Daglig e-postdigest", retries: 1 },
  { cron: "0 20 * * *" },
  async ({ step }) => {
    const toEmail = process.env.DIGEST_EMAIL ?? "Markus08aasheim@gmail.com";

    const runs = await step.run("hent-dagens-kjøringer", async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const rows = await db
        .select({
          status: schema.agentRuns.status,
          trigger: schema.agentRuns.trigger,
          startedAt: schema.agentRuns.startedAt,
          durationMs: schema.agentRuns.durationMs,
          inputTokens: schema.agentRuns.inputTokens,
          outputTokens: schema.agentRuns.outputTokens,
          costMicroUsd: schema.agentRuns.costMicroUsd,
          output: schema.agentRuns.output,
          agentName: schema.agents.name,
          agentDepartment: schema.agents.department,
        })
        .from(schema.agentRuns)
        .leftJoin(schema.agents, eq(schema.agentRuns.agentId, schema.agents.id))
        .where(
          and(
            eq(schema.agentRuns.orgId, DEFAULT_ORG_ID),
            gte(schema.agentRuns.startedAt, today),
            lte(schema.agentRuns.startedAt, tomorrow)
          )
        )
        .orderBy(schema.agentRuns.startedAt);

      return rows.map((r) => ({
        agentName: r.agentName ?? "Ukjent",
        department: r.agentDepartment ?? "command",
        status: r.status,
        durationMs: r.durationMs,
        inputTokens: r.inputTokens ?? 0,
        outputTokens: r.outputTokens ?? 0,
        costMicroUsd: Number(r.costMicroUsd ?? 0),
        summary: (r.output as Record<string, unknown>)?.summary as string ?? "",
        startedAt: r.startedAt?.toISOString() ?? null,
      }));
    });

    if (runs.length === 0) {
      return { skipped: true, reason: "Ingen kjøringer i dag" };
    }

    await step.run("send-digest", () =>
      sendEmail({
        to: toEmail,
        subject: `Agent Imperiet digest · ${dagsDato()}`,
        html: buildDigestEmail(runs, dagsDato()),
      })
    );

    return {
      sent: true,
      to: toEmail,
      runsIncluded: runs.length,
    };
  }
);
