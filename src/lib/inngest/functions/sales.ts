import { inngest } from "../client";
import { makeCtx, dagsDato, safePayload } from "../utils";
import { TitanAgent } from "@/lib/agents/sales";
import { PulseAgent } from "@/lib/agents/sales";
import { RexAgent } from "@/lib/agents/sales";
import { appendMemory } from "@/lib/tools/memory";
import { notifySlack } from "@/lib/notify/slack";
import { db, schema } from "@/lib/db";
import { and, eq, lte, inArray } from "drizzle-orm";
import { DEFAULT_ORG_ID } from "@/lib/db/constants";

const titan = new TitanAgent();
const pulse = new PulseAgent();
const rex = new RexAgent();

// ─── Titan — daglig oppfølgingsplan (hverdager 08:00) ────────────────────

export const titanDagligOppfolging = inngest.createFunction(
  { id: "titan-daglig-oppfolging", name: "Titan · Daglig oppfølgingsplan", retries: 1 },
  { cron: "0 8 * * 1-5" },
  async ({ step }) => {
    const { ctx, runId, logs, persistRun, isHalted } = makeCtx("titan");
    if (await step.run("sjekk-kill-switch", isHalted)) {
      return { skipped: true, reason: "system_disabled" };
    }
    const output = await step.run("titan-planlegger", () =>
      titan.run(
        { message: `Det er ${dagsDato()}. Hvilke prospects bør Markus følge opp i dag? Lever konkret oppfølgingsplan.` },
        ctx
      )
    );
    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, plan: output.summary, usage: output.usage, logs };
  }
);

// Titan aktiveres når Hermes har sendt outreach
export const titanOppfolgingEtterHermes = inngest.createFunction(
  { id: "titan-etter-hermes", name: "Titan · Oppfølging etter outreach", retries: 1 },
  { event: "hermes/outreach.sent" },
  async ({ event, step }) => {
    const p = safePayload(event.data, ["hermesRunId", "mottakere"]);
    const { ctx, runId, logs, persistRun, isHalted } = makeCtx("titan", p.hermesRunId ?? undefined);
    if (await step.run("sjekk-kill-switch", isHalted)) return { skipped: true };

    const mottakere = p.mottakere ?? "(ingen liste)";
    const output = await step.run("titan-planlegger-oppfolging", () =>
      titan.run(
        {
          message: `Hermes har sendt outreach til følgende prospects:\n\n${mottakere}\n\nLag en 7-dagers oppfølgingssekvens for disse.`,
        },
        ctx
      )
    );
    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, sekvens: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);

// ─── Pulse — daglig pipeline-hygiene (hverdager 17:00) ───────────────────

export const pulsePipelineHygiene = inngest.createFunction(
  { id: "pulse-pipeline-hygiene", name: "Pulse · Pipeline-hygiene", retries: 2 },
  { cron: "0 17 * * 1-5" },
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("pulse");
    const output = await step.run("pulse-rydder", () =>
      pulse.run(
        { message: `Dato: ${dagsDato()}. Gjennomfør daglig pipeline-hygiene. Identifiser stale leads og gi oppfølgingsanbefalinger.` },
        ctx
      )
    );
    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, rapport: output.summary, usage: output.usage, logs };
  }
);

// ─── Rex — ukentlig revenue-analyse (fredager 09:00) ─────────────────────

export const rexUkesanalyse = inngest.createFunction(
  { id: "rex-ukesanalyse", name: "Rex · Ukentlig revenue-analyse", retries: 2 },
  { cron: "0 9 * * 5" },
  async ({ step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("rex");
    const output = await step.run("rex-analyserer", () =>
      rex.run(
        { message: `Fredag ${dagsDato()}. Lever ukentlig revenue-analyse med pipeline-helse og ARR-prognose.` },
        ctx
      )
    );

    // Send til Ledger for ukesrapporten
    await step.run("publiser-revenue", async () => {
      await inngest.send({
        name: "rex/revenue.ready",
        data: { analyse: output.summary, dato: new Date().toISOString() },
      });
    });

    await step.run("lagre-kjøring", () => persistRun(output));

    return { runId, analyse: output.summary, artifacts: output.artifacts, usage: output.usage, logs };
  }
);

// ─── No-reply timeout — daglig kl. 06:30 ─────────────────────────────────
// Finner leads som ikke har svart på 7+ dager, markerer dem og lærer Nova

export const noReplyTimeout = inngest.createFunction(
  { id: "no-reply-timeout", name: "Pipeline · No-reply timeout", retries: 2 },
  { cron: "30 6 * * 1-5" },
  async ({ step }) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    // Find stale contacted leads
    const staleLeads = await step.run("finn-stale-leads", () =>
      db.query.leads.findMany({
        where: and(
          eq(schema.leads.orgId, DEFAULT_ORG_ID),
          inArray(schema.leads.status, ["contacted"]),
          lte(schema.leads.lastContactedAt, cutoff)
        ),
        limit: 50,
      })
    );

    if (staleLeads.length === 0) return { noReply: 0 };

    // Update status to no_reply
    await step.run("oppdater-status", () =>
      db
        .update(schema.leads)
        .set({ status: "no_reply", updatedAt: new Date() })
        .where(
          and(
            eq(schema.leads.orgId, DEFAULT_ORG_ID),
            inArray(schema.leads.id, staleLeads.map((l) => l.id))
          )
        )
    );

    // Log patterns to Nova's memory so it learns what's not working
    for (const lead of staleLeads) {
      await step.run(`logg-memory-${lead.id}`, () =>
        appendMemory("nova", "no_reply_patterns", {
          specialty: lead.specialty,
          location: lead.location,
          source: lead.source,
          fitScore: lead.fitScore,
          daysSinceContact: Math.floor((Date.now() - (lead.lastContactedAt ? new Date(lead.lastContactedAt).getTime() : Date.now())) / 86400000),
        })
      );
    }

    // Fire event for Titan to decide if any deserve a follow-up
    await step.run("varsle-titan", () =>
      inngest.send({
        name: "pipeline/no-reply.detected",
        data: {
          count: staleLeads.length,
          leads: staleLeads.map((l) => ({
            id: l.id,
            companyName: l.companyName,
            specialty: l.specialty,
            location: l.location,
          })),
        },
      })
    );

    return { noReply: staleLeads.length, companies: staleLeads.map((l) => l.companyName) };
  }
);

// Titan vurderer om no-reply leads fortjener én siste oppfølging
export const titanVurdererNoReply = inngest.createFunction(
  { id: "titan-vurderer-no-reply", name: "Titan · Vurderer no-reply leads", retries: 1 },
  { event: "pipeline/no-reply.detected" },
  async ({ event, step }) => {
    const { ctx, runId, logs, persistRun } = makeCtx("titan");
    const { leads, count } = event.data as { count: number; leads: Array<{ id: string; companyName: string; specialty: string; location: string }> };

    const output = await step.run("titan-vurderer", () =>
      titan.run(
        {
          message: `${count} leads har ikke svart på 7+ dager og er nå markert som no_reply:\n\n${leads.map((l) => `- ${l.companyName} (${l.specialty}, ${l.location})`).join("\n")}\n\nVurder: hvilke av disse fortjener én siste oppfølging med ny vinkel? For de som ikke gjør det — la dem ligge. Bruk din hukommelse om hva som virker.`,
        },
        ctx
      )
    );

    await step.run("lagre-kjøring", () => persistRun(output, "event"));
    return { runId, vurdering: output.summary, usage: output.usage, logs };
  }
);

// ─── Titan — reagerer på inkommende e-postsvar ────────────────────────────

export const titanReagerPaaSvar = inngest.createFunction(
  { id: "titan-reager-paa-svar", name: "Titan · Reager på e-postsvar", retries: 2 },
  { event: "email/reply.received" },
  async ({ event, step }) => {
    // Supports both field name conventions:
    // webhook sends: { from, subject, text, leadId }
    // older format:  { fromEmail, body, subject, leadId }
    const d = (event.data ?? {}) as Record<string, unknown>;
    const fromEmail = (d.from ?? d.fromEmail ?? null) as string | null;
    const subject   = (d.subject ?? "(uten emne)") as string;
    const body      = (d.text ?? d.body ?? null) as string | null;
    const leadId    = (d.leadId ?? null) as string | null;

    if (!fromEmail) {
      console.warn("[titan] email/reply.received mangler 'from' — hopper over");
      return { skipped: true, reason: "missing_from" };
    }

    const { ctx, runId, logs, persistRun, isHalted } = makeCtx("titan");
    if (await step.run("sjekk-kill-switch", isHalted)) return { skipped: true };

    const output = await step.run("titan-svarer", () =>
      titan.run(
        {
          message: `Du har mottatt et svar fra ${fromEmail}.

Emne: ${subject}

Melding:
${body ?? "(tomt)"}

${leadId ? `Lead-ID: ${leadId}` : "Ukjent avsender — ikke i systemet ennå."}

Les svaret nøye, vurder tonen og intensjonen, og send et passende svar som pusher mot demo-booking. Bruk send_reply-verktøyet. Oppdater lead-status med update_lead_status.`,
        },
        ctx
      )
    );

    await step.run("lagre-kjøring", () => persistRun(output, "event"));
    return { runId, svar: output.summary, usage: output.usage, logs };
  }
);
