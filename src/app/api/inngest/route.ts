import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";

// Original 7 agents
import { guardianHealthCheck } from "@/lib/inngest/functions/guardian";
import { ledgerDailyBrief } from "@/lib/inngest/functions/ledger";
import { jarvisGuardianAlert, jarvisMorgenplan } from "@/lib/inngest/functions/jarvis";
import { novaProspektering } from "@/lib/inngest/functions/nova";
import { hermesSkrivMeldinger, hermesManuelOpdrag } from "@/lib/inngest/functions/hermes";
import { devLogganalyse } from "@/lib/inngest/functions/dev";
import { scribeUkesanalyse, scribeManueltOppdrag } from "@/lib/inngest/functions/scribe";

// Command
import {
  athenaUkestrategi, athenaReagerPaaIntel,
  oracleDagligIntel, nexusDagligKoordinering,
} from "@/lib/inngest/functions/command";

// Engineering
import {
  forgeImplementerer, forgeManuelOppdrag,
  cipherReviewer, sentinelQA,
  patchInfraCheck, patchReagerSikkerhet,
} from "@/lib/inngest/functions/engineering";

// Sales
import {
  titanDagligOppfolging, titanOppfolgingEtterHermes, titanReagerPaaSvar,
  pulsePipelineHygiene, rexUkesanalyse,
} from "@/lib/inngest/functions/sales";

// Marketing
import {
  beaconSeoAnalyse, museSkriverInnhold, museReagerPaaBeacon,
  prismReviewer, prismReviewerOutreach, echoDistribuerer,
} from "@/lib/inngest/functions/marketing";

// Analytics
import { lensDagligKpis, sageUkesrapport, quillDagligSyntese } from "@/lib/inngest/functions/analytics";

// Operations
import {
  vaultSikkerhetssjekk, fluxLoggEndring, fluxPlanleggEndring, kronosOptimaliser,
} from "@/lib/inngest/functions/operations";

// Finance
import { mintKostnadsrapport, voltVekstanalyse } from "@/lib/inngest/functions/finance";

// Research
import {
  darwinProductBrief, darwinAnalyserFeedback,
  atlasTekniskResearch, siloByggerKunnskapsbase, siloLoggBeslutning,
} from "@/lib/inngest/functions/research";

// Notifications
import { dailyDigest } from "@/lib/inngest/functions/notifications";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // ── Original 7 ──────────────────────────────────────────────────────
    guardianHealthCheck, ledgerDailyBrief,
    jarvisGuardianAlert, jarvisMorgenplan,
    novaProspektering, hermesSkrivMeldinger, hermesManuelOpdrag,
    devLogganalyse, scribeUkesanalyse, scribeManueltOppdrag,

    // ── Command ─────────────────────────────────────────────────────────
    athenaUkestrategi, athenaReagerPaaIntel,
    oracleDagligIntel, nexusDagligKoordinering,

    // ── Engineering ─────────────────────────────────────────────────────
    forgeImplementerer, forgeManuelOppdrag,
    cipherReviewer, sentinelQA,
    patchInfraCheck, patchReagerSikkerhet,

    // ── Sales ────────────────────────────────────────────────────────────
    titanDagligOppfolging, titanOppfolgingEtterHermes, titanReagerPaaSvar,
    pulsePipelineHygiene, rexUkesanalyse,

    // ── Marketing ────────────────────────────────────────────────────────
    beaconSeoAnalyse, museSkriverInnhold, museReagerPaaBeacon,
    prismReviewer, prismReviewerOutreach, echoDistribuerer,

    // ── Analytics ────────────────────────────────────────────────────────
    lensDagligKpis, sageUkesrapport, quillDagligSyntese,

    // ── Operations ───────────────────────────────────────────────────────
    vaultSikkerhetssjekk, fluxLoggEndring, fluxPlanleggEndring, kronosOptimaliser,

    // ── Finance ──────────────────────────────────────────────────────────
    mintKostnadsrapport, voltVekstanalyse,

    // ── Research ─────────────────────────────────────────────────────────
    darwinProductBrief, darwinAnalyserFeedback,
    atlasTekniskResearch, siloByggerKunnskapsbase, siloLoggBeslutning,

    // ── Notifications ─────────────────────────────────────────────────────
    dailyDigest,
  ],
});
