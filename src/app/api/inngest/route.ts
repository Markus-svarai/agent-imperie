import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";

// Vercel Pro: 300s max. Hobby: 60s (functions may still time out on slow Anthropic days).
export const maxDuration = 300;

// Diagnostic: confirm signing key is present at startup (never logs the value)
console.log("[inngest/route] has INNGEST_SIGNING_KEY:", !!process.env.INNGEST_SIGNING_KEY);
console.log("[inngest/route] has INNGEST_EVENT_KEY:", !!process.env.INNGEST_EVENT_KEY);

// ── Aktive agenter (brief + klinikk-pipeline) ─────────────────────────────

// System
import { guardianHealthCheck } from "@/lib/inngest/functions/guardian";
import { jarvisGuardianAlert, jarvisMorgenplan } from "@/lib/inngest/functions/jarvis";

// Command & koordinering
import {
  athenaUkestrategi, athenaReagerPaaIntel,
  oracleDagligIntel, nexusDagligKoordinering,
} from "@/lib/inngest/functions/command";

// Sales – finn, analyser og kontakt klinikker
import { novaProspektering } from "@/lib/inngest/functions/nova";
import {
  hermesSkrivMeldinger, hermesManuelOpdrag, hermesLaererAvScribe,
} from "@/lib/inngest/functions/hermes";
import {
  titanDagligOppfolging, titanOppfolgingEtterHermes, titanReagerPaaSvar,
  pulsePipelineHygiene, rexUkesanalyse,
  noReplyTimeout, titanVurdererNoReply,
  titanRingListe,
} from "@/lib/inngest/functions/sales";

// Varsler
import { dailyDigest, dealClosedVarsling, onFunctionFailed } from "@/lib/inngest/functions/notifications";

// Generisk kommandohåndterer
import { agentManualCommand } from "@/lib/inngest/functions/command-handler";

// ── Deaktivert (ikke relevant ennå) ──────────────────────────────────────
// ledgerDailyBrief       – finansrapporter
// quillDagligSyntese     – 72k-token executive summaries
// lensDagligKpis         – KPI-rapporter
// sageUkesrapport        – ukesrapporter
// mintKostnadsrapport, voltVekstanalyse – finans
// beacon, muse, prism, echo – markedsføring
// forge, cipher, sentinel, patch – engineering
// devLogganalyse, scribe – dev/skriving
// vault, flux, kronos    – operasjoner
// darwin, atlas, silo    – research/kunnskapsbase

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // ── System ──────────────────────────────────────────────────────────
    guardianHealthCheck,
    jarvisGuardianAlert, jarvisMorgenplan,

    // ── Command & koordinering ───────────────────────────────────────────
    athenaUkestrategi, athenaReagerPaaIntel,
    oracleDagligIntel, nexusDagligKoordinering,

    // ── Sales pipeline ───────────────────────────────────────────────────
    novaProspektering,
    hermesSkrivMeldinger, hermesManuelOpdrag, hermesLaererAvScribe,
    titanDagligOppfolging, titanOppfolgingEtterHermes, titanReagerPaaSvar,
    pulsePipelineHygiene, rexUkesanalyse,
    noReplyTimeout, titanVurdererNoReply,
    titanRingListe,

    // ── Varsler & generelt ───────────────────────────────────────────────
    dailyDigest, dealClosedVarsling, onFunctionFailed,
    agentManualCommand,
  ],
});
