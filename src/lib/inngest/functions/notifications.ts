import { inngest } from "../client";
import { db, schema } from "@/lib/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";
import { sendEmail, buildDigestEmail } from "@/lib/notify/email";
import { dagsDato } from "../utils";

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
