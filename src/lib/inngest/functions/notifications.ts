import { inngest } from "../client";
import { db, schema } from "@/lib/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";
import { sendEmail, buildDigestEmail } from "@/lib/notify/email";
import { notifySlack } from "@/lib/notify/slack";
import { notifyMarkus } from "@/lib/tools/notify";
import { dagsDato } from "../utils";

// ─── Global feilhåndterer — logger alle agent-feil til DB ────────────────────
// Inngest fyrer "inngest/function.failed" etter at alle retries er brukt opp.
// Én handler dekker alle agenter — ingen endringer nødvendig i individuelle filer.

export const onFunctionFailed = inngest.createFunction(
  { id: "on-function-failed", name: "System · Logg agent-feil", retries: 0 },
  { event: "inngest/function.failed" },
  async ({ event, step }) => {
    await step.run("logg-feil-i-db", async () => {
      const data = event.data as {
        function_id: string;
        run_id?: string;
        error?: { message?: string; name?: string; stack?: string };
      };

      const { function_id, error } = data;

      // Utled agent-navn fra funksjon-ID ved å prøve prefixer av stigende lengde.
      // "nova-daglig-prospektering" → try "Nova", then "Nova-daglig" etc.
      // Handles multi-word agent names like "guardian-health-check" → "Guardian" or "no-reply-timeout" → skip gracefully.
      const parts = function_id.split("-");
      let agentRecord = null;
      for (let i = 1; i <= Math.min(parts.length, 3); i++) {
        const slug = parts.slice(0, i).join("-");
        const candidate = slug.charAt(0).toUpperCase() + slug.slice(1);
        const found = await db.query.agents.findFirst({
          where: eq(schema.agents.name, candidate),
        });
        if (found) {
          agentRecord = found;
          break;
        }
      }

      const agentName = agentRecord?.name ?? (parts[0]?.charAt(0).toUpperCase() + (parts[0]?.slice(1) ?? ""));

      if (!agentRecord) {
        // Non-agent function (e.g. "on-function-failed", "daily-digest") — log but don't insert orphaned run
        console.warn(`[onFunctionFailed] Ingen agent funnet for funksjon: ${function_id} — hopper over DB-insert`);
        // Still email Markus so it doesn't go unnoticed
        await notifyMarkus({
          subject: `⚠️ System-funksjon feilet: ${function_id}`,
          agentName: function_id,
          agentColor: "#f59e0b",
          body: `System-funksjon **${function_id}** feilet (ingen agent-match).\n\n**Feil:** ${error?.message ?? "Ukjent feil"}`,
        });
        return { skipped: true, reason: "no_agent_match", functionId: function_id };
      }

      const errorMsg = error?.message ?? "Ukjent feil";
      const now = new Date();

      await db.insert(schema.agentRuns).values({
        orgId: DEFAULT_ORG_ID,
        agentId: agentRecord.id,
        status: "failed",
        trigger: "schedule",
        input: { functionId: function_id },
        output: {
          error: errorMsg,
          errorName: error?.name ?? "Error",
          summary: `❌ Feilet etter alle retries: ${errorMsg.slice(0, 300)}`,
        },
        error: errorMsg.slice(0, 1000),
        startedAt: now,
        endedAt: now,
        durationMs: 0,
        inputTokens: 0,
        outputTokens: 0,
        costMicroUsd: 0,
        parentRunId: null,
      });

      // E-postvarsling til Markus
      await notifyMarkus({
        subject: `⚠️ Agent feilet: ${agentName}`,
        agentName,
        agentColor: "#ef4444",
        body: `Funksjon **${function_id}** feilet etter alle retries.\n\n**Feil:** ${errorMsg}`,
      });

      return { logged: true, agent: agentName, error: errorMsg };
    });
  }
);

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
