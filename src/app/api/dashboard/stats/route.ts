import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { and, eq, gte, sum, count, desc, sql } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // ── Lead pipeline counts ────────────────────────────────────────────────
    const pipelineRows = await db
      .select({ status: schema.leads.status, cnt: count() })
      .from(schema.leads)
      .where(eq(schema.leads.orgId, DEFAULT_ORG_ID))
      .groupBy(schema.leads.status);

    const pipeline: Record<string, number> = {};
    let pipelineTotal = 0;
    for (const r of pipelineRows) {
      pipeline[r.status] = Number(r.cnt);
      pipelineTotal += Number(r.cnt);
    }

    // ── Runs in last 24h + tokens/cost ──────────────────────────────────────
    const runStats = await db
      .select({
        runs: count(),
        inputTokens: sum(schema.agentRuns.inputTokens),
        outputTokens: sum(schema.agentRuns.outputTokens),
        costMicroUsd: sum(schema.agentRuns.costMicroUsd),
      })
      .from(schema.agentRuns)
      .where(
        and(
          eq(schema.agentRuns.orgId, DEFAULT_ORG_ID),
          gte(schema.agentRuns.startedAt, h24ago)
        )
      );

    const rs = runStats[0];
    const runs24h = Number(rs?.runs ?? 0);
    const tokensToday =
      Number(rs?.inputTokens ?? 0) + Number(rs?.outputTokens ?? 0);
    const costTodayUsd = Number(rs?.costMicroUsd ?? 0) / 1_000_000;

    // ── Last inbound email ───────────────────────────────────────────────────
    const lastInboundRows = await db
      .select({
        id: schema.outreachEmails.id,
        fromEmail: schema.outreachEmails.fromEmail,
        subject: schema.outreachEmails.subject,
        body: schema.outreachEmails.body,
        sentAt: schema.outreachEmails.sentAt,
        createdAt: schema.outreachEmails.createdAt,
        leadId: schema.outreachEmails.leadId,
        leadName: schema.leads.companyName,
        leadContact: schema.leads.contactName,
      })
      .from(schema.outreachEmails)
      .leftJoin(schema.leads, eq(schema.outreachEmails.leadId, schema.leads.id))
      .where(
        and(
          eq(schema.outreachEmails.orgId, DEFAULT_ORG_ID),
          eq(schema.outreachEmails.direction, "inbound")
        )
      )
      .orderBy(desc(schema.outreachEmails.createdAt))
      .limit(1);

    const lastInbound = lastInboundRows[0] ?? null;

    // ── Last Titan run ───────────────────────────────────────────────────────
    const lastTitanRows = await db
      .select({
        startedAt: schema.agentRuns.startedAt,
        status: schema.agentRuns.status,
        summary: schema.agentRuns.output,
      })
      .from(schema.agentRuns)
      .leftJoin(schema.agents, eq(schema.agentRuns.agentId, schema.agents.id))
      .where(
        and(
          eq(schema.agentRuns.orgId, DEFAULT_ORG_ID),
          eq(schema.agents.name, "Titan")
        )
      )
      .orderBy(desc(schema.agentRuns.startedAt))
      .limit(1);

    const lastTitan = lastTitanRows[0] ?? null;

    // ── Agent status: most recent run per agent (last 24h window) ────────────
    // Get the latest run for every agent
    const agentStatusRows = await db
      .select({
        agentName: schema.agents.name,
        agentDepartment: schema.agents.department,
        status: schema.agentRuns.status,
        startedAt: schema.agentRuns.startedAt,
        summary: schema.agentRuns.output,
      })
      .from(schema.agentRuns)
      .leftJoin(schema.agents, eq(schema.agentRuns.agentId, schema.agents.id))
      .where(eq(schema.agentRuns.orgId, DEFAULT_ORG_ID))
      .orderBy(desc(schema.agentRuns.startedAt))
      .limit(100); // grab enough to cover all agents

    // Deduplicate — keep only the latest run per agent
    const agentStatus: Record<
      string,
      { status: string; lastRunAt: string | null; summary: string; department: string }
    > = {};
    for (const r of agentStatusRows) {
      const name = (r.agentName ?? "unknown").toLowerCase();
      if (agentStatus[name]) continue; // already have latest
      const runAt = r.startedAt?.toISOString() ?? null;
      const isRecent = runAt && new Date(runAt) >= h24ago;
      agentStatus[name] = {
        department: r.agentDepartment ?? "command",
        status: isRecent ? (r.status ?? "idle") : "idle",
        lastRunAt: runAt,
        summary:
          ((r.summary as Record<string, unknown>)?.summary as string) ?? "",
      };
    }

    // ── Activity feed — merged timeline ─────────────────────────────────────
    // Source 1: recent agent runs
    const recentRuns = await db
      .select({
        id: schema.agentRuns.id,
        status: schema.agentRuns.status,
        trigger: schema.agentRuns.trigger,
        startedAt: schema.agentRuns.startedAt,
        output: schema.agentRuns.output,
        agentName: schema.agents.name,
        agentDepartment: schema.agents.department,
      })
      .from(schema.agentRuns)
      .leftJoin(schema.agents, eq(schema.agentRuns.agentId, schema.agents.id))
      .where(eq(schema.agentRuns.orgId, DEFAULT_ORG_ID))
      .orderBy(desc(schema.agentRuns.startedAt))
      .limit(15);

    // Source 2: recent emails (both directions)
    const recentEmails = await db
      .select({
        id: schema.outreachEmails.id,
        direction: schema.outreachEmails.direction,
        fromEmail: schema.outreachEmails.fromEmail,
        toEmail: schema.outreachEmails.toEmail,
        subject: schema.outreachEmails.subject,
        sentAt: schema.outreachEmails.sentAt,
        createdAt: schema.outreachEmails.createdAt,
        leadName: schema.leads.companyName,
        leadContact: schema.leads.contactName,
      })
      .from(schema.outreachEmails)
      .leftJoin(schema.leads, eq(schema.outreachEmails.leadId, schema.leads.id))
      .where(eq(schema.outreachEmails.orgId, DEFAULT_ORG_ID))
      .orderBy(desc(schema.outreachEmails.createdAt))
      .limit(10);

    // Source 3: recently created or updated leads
    const recentLeads = await db
      .select({
        id: schema.leads.id,
        companyName: schema.leads.companyName,
        status: schema.leads.status,
        specialty: schema.leads.specialty,
        location: schema.leads.location,
        createdAt: schema.leads.createdAt,
        updatedAt: schema.leads.updatedAt,
      })
      .from(schema.leads)
      .where(eq(schema.leads.orgId, DEFAULT_ORG_ID))
      .orderBy(desc(schema.leads.updatedAt))
      .limit(8);

    // Build unified activity items
    type ActivityItem = {
      id: string;
      type: "run" | "email_in" | "email_out" | "lead_new" | "lead_status";
      agentName?: string;
      department?: string;
      title: string;
      description: string;
      status?: string;
      ts: string;
    };

    const activity: ActivityItem[] = [];

    // Deduplicate runs: max 1 entry per agent in the feed (most recent wins)
    const seenAgents = new Set<string>();

    for (const r of recentRuns) {
      const name = r.agentName ?? "Agent";

      // Skip duplicate agents — only show the latest run per agent
      if (seenAgents.has(name)) continue;
      seenAgents.add(name);

      const summary =
        ((r.output as Record<string, unknown>)?.summary as string) ?? "";
      // Strip markdown headers and emoji clutter for the preview line
      const cleanSummary = summary
        .replace(/^#+\s*/gm, "")
        .replace(/[*_~`#]/g, "")
        .split("\n")
        .find((l) => l.trim().length > 10) ?? "";
      const shortSummary = cleanSummary.slice(0, 100).trim();
      const statusIcon =
        r.status === "completed" ? "✅" : r.status === "failed" ? "❌" : "⚙️";

      const titleMap: Record<string, string> = {
        Nova: `Nova fant nye leads`,
        Hermes: `Hermes sendte outreach`,
        Titan: `Titan behandlet leads`,
        Athena: `Athena laget strategianalyse`,
        Oracle: `Oracle leverte markedsintel`,
        Nexus: `Nexus koordinerte flåten`,
        Beacon: `Beacon kjørte SEO-analyse`,
        Muse: `Muse produserte innhold`,
        Prism: `Prism reviewet innhold`,
        Echo: `Echo distribuerte innhold`,
        Lens: `Lens analyserte pipeline`,
        Sage: `Sage leverte markedsanalyse`,
        Quill: `Quill genererte rapport`,
        Jarvis: `Jarvis leverte systemstatus`,
        Forge: `Forge jobbet med kodebase`,
        Cipher: `Cipher utførte sikkerhetssjekk`,
        Sentinel: `Sentinel monitorerte systemet`,
        Patch: `Patch håndterte bugs`,
        Vault: `Vault sjekket dataintegritet`,
        Flux: `Flux optimaliserte workflower`,
        Kronos: `Kronos koordinerte schedules`,
        Mint: `Mint analyserte økonomi`,
        Volt: `Volt optimaliserte kostnader`,
        Darwin: `Darwin utførte markedsresearch`,
        Atlas: `Atlas kartla konkurranselandskapet`,
        Silo: `Silo organiserte kunnskap`,
        Rex: `Rex genererte leads`,
        Pulse: `Pulse analyserte konvertering`,
        Dev: `Dev jobbet med kodebase`,
        Scribe: `Scribe dokumenterte systemet`,
        Ledger: `Ledger kjørte regnskapssjekk`,
      };

      activity.push({
        id: `run-${r.id}`,
        type: "run",
        agentName: name,
        department: r.agentDepartment ?? "command",
        title: titleMap[name] ?? `${name} kjørte`,
        description: shortSummary || `Trigger: ${r.trigger}`,
        status: r.status ?? "completed",
        ts: r.startedAt?.toISOString() ?? new Date(0).toISOString(),
      });
    }

    for (const e of recentEmails) {
      const clinic = e.leadName ?? e.fromEmail ?? e.toEmail;
      const ts = (e.sentAt ?? e.createdAt)?.toISOString() ?? new Date(0).toISOString();
      if (e.direction === "inbound") {
        activity.push({
          id: `email-${e.id}`,
          type: "email_in",
          title: `Svar mottatt fra ${clinic}`,
          description: e.subject,
          ts,
        });
      } else {
        activity.push({
          id: `email-${e.id}`,
          type: "email_out",
          agentName: "Hermes",
          department: "sales",
          title: `Outreach sendt til ${clinic}`,
          description: e.subject,
          ts,
        });
      }
    }

    // Only include leads that changed status recently (not just any lead)
    for (const l of recentLeads) {
      const createdRecently =
        l.createdAt && new Date(l.createdAt) >= h24ago;
      const updatedRecently =
        l.updatedAt &&
        new Date(l.updatedAt) >= h24ago &&
        l.updatedAt.getTime() !== l.createdAt?.getTime();

      if (createdRecently) {
        activity.push({
          id: `lead-new-${l.id}`,
          type: "lead_new",
          agentName: "Nova",
          department: "sales",
          title: `Ny lead: ${l.companyName}`,
          description: [l.specialty, l.location].filter(Boolean).join(" · ") || "Klinikk lagt til",
          ts: l.createdAt?.toISOString() ?? new Date(0).toISOString(),
        });
      } else if (updatedRecently) {
        const statusLabels: Record<string, string> = {
          contacted: "kontaktet",
          replied: "svarte",
          interested: "interessert",
          demo_booked: "booket demo",
          not_interested: "ikke interessert",
          no_reply: "ingen svar",
        };
        activity.push({
          id: `lead-status-${l.id}`,
          type: "lead_status",
          title: `${l.companyName} — ${statusLabels[l.status] ?? l.status}`,
          description: `Status oppdatert`,
          status: l.status,
          ts: l.updatedAt?.toISOString() ?? new Date(0).toISOString(),
        });
      }
    }

    // Sort by ts descending, take top 20
    activity.sort(
      (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
    );
    const feed = activity.slice(0, 20);

    // ── Suggested action ─────────────────────────────────────────────────────
    const repliedCount = pipeline["replied"] ?? 0;
    const interestedCount = pipeline["interested"] ?? 0;
    const newCount = pipeline["new"] ?? 0;

    let suggestedAction: { label: string; reason: string; urgency: "high" | "medium" | "low" } | null = null;

    if (lastInbound) {
      suggestedAction = {
        label: "Sjekk siste svar i Kommando → Titan",
        reason: `${lastInbound.leadName ?? lastInbound.fromEmail} har svart`,
        urgency: "high",
      };
    } else if (repliedCount + interestedCount > 0) {
      suggestedAction = {
        label: `Følg opp ${repliedCount + interestedCount} lead(s) som svarte`,
        reason: "Varme leads venter på oppfølging",
        urgency: "high",
      };
    } else if (newCount > 0) {
      suggestedAction = {
        label: `${newCount} nye leads klar for outreach`,
        reason: "Hermes kan sende første e-post",
        urgency: "medium",
      };
    }

    return NextResponse.json({
      // Pipeline
      pipeline: {
        total: pipelineTotal,
        new: pipeline["new"] ?? 0,
        contacted: pipeline["contacted"] ?? 0,
        replied: pipeline["replied"] ?? 0,
        interested: pipeline["interested"] ?? 0,
        demo_booked: pipeline["demo_booked"] ?? 0,
        not_interested: pipeline["not_interested"] ?? 0,
        no_reply: pipeline["no_reply"] ?? 0,
      },

      // Runs
      runs24h,
      tokensToday,
      costTodayUsd,

      // Last inbound
      lastInbound: lastInbound
        ? {
            from: lastInbound.leadName ?? lastInbound.fromEmail,
            email: lastInbound.fromEmail,
            subject: lastInbound.subject,
            preview: lastInbound.body.slice(0, 200),
            receivedAt: (lastInbound.sentAt ?? lastInbound.createdAt)?.toISOString() ?? null,
          }
        : null,

      // Last Titan
      lastTitanRunAt: lastTitan?.startedAt?.toISOString() ?? null,
      lastTitanStatus: lastTitan?.status ?? null,

      // Agent status map
      agentStatus,

      // Activity feed
      activity: feed,

      // Suggested action
      suggestedAction,
    });
  } catch (err) {
    console.error("[dashboard/stats] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
