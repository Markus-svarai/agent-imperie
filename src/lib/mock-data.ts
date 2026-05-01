import type { AgentCardData } from "@/components/agent-card";

/**
 * Mock data for the full Agent Imperie fleet.
 *
 * 32 agents across 8 departments — the full operating company.
 * In Phase 2 these reads get replaced with real Drizzle queries.
 * Component contracts stay the same — only the data source changes.
 */

export const MOCK_AGENTS: AgentCardData[] = [
  // ─── COMMAND (4) ────────────────────────────────────────────────────────────
  {
    id: "jarvis",
    name: "Jarvis",
    department: "command",
    role: "orchestrator",
    model: "opus",
    status: "idle",
    description:
      "CEO og operasjonssjef. Koordinerer hele flåten, tar strategiske beslutninger og griper inn der det krever Opus-tankegang.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "event-driven",
  },
  {
    id: "athena",
    name: "Athena",
    department: "command",
    role: "strategist",
    model: "opus",
    status: "idle",
    description:
      "Chief Strategy Officer. Utarbeider kvartalsvise strategiplaner, vurderer markedsmuligheter og anbefaler store retningsskifter.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "0 8 * * 1",
  },
  {
    id: "oracle",
    name: "Oracle",
    department: "command",
    role: "intelligence",
    model: "sonnet",
    status: "idle",
    description:
      "Intelligence Director. Henter markedssignaler, overvåker konkurrenter og leverer ukentlige trusselrapporter til Jarvis.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "0 7 * * *",
  },
  {
    id: "nexus",
    name: "Nexus",
    department: "command",
    role: "coordinator",
    model: "sonnet",
    status: "idle",
    description:
      "Chief of Staff. Løser koordineringskonflikter mellom avdelinger, oppdaterer prioriteringskøen og sender daglig status til Jarvis.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "0 6 30 * * *",
  },

  // ─── ENGINEERING (5) ────────────────────────────────────────────────────────
  {
    id: "forge",
    name: "Forge",
    department: "engineering",
    role: "engineer",
    model: "sonnet",
    status: "idle",
    description:
      "Lead Engineer. Skriver primær kode for nye features basert på spec fra Darwin. Sender all output til Cipher for review.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "event-driven",
  },
  {
    id: "cipher",
    name: "Cipher",
    department: "engineering",
    role: "reviewer",
    model: "sonnet",
    status: "idle",
    description:
      "Code Reviewer. Leser kode fra Forge og sjekker logikk, sikkerhet og ytelse. Returnerer godkjent diff eller spesifikke endringsforslag.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "event-driven",
  },
  {
    id: "sentinel",
    name: "Sentinel",
    department: "engineering",
    role: "qa",
    model: "haiku",
    status: "idle",
    description:
      "QA Engineer. Skriver testcases, finner edge cases og validerer at Cipher-godkjent kode faktisk oppfører seg som forventet.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "event-driven",
  },
  {
    id: "patch",
    name: "Patch",
    department: "engineering",
    role: "devops",
    model: "sonnet",
    status: "idle",
    description:
      "DevOps Engineer. Overvåker infrastruktur, håndterer deployments og sender rollback-signal til Flux ved kritiske feil.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "0 */6 * * *",
  },
  {
    id: "dev",
    name: "Dev",
    department: "engineering",
    role: "developer",
    model: "sonnet",
    status: "idle",
    description:
      "Log Debugger. Leser produksjonslogger, kategoriserer feil etter alvorlighetsgrad og foreslår konkrete fixes.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "0 */4 * * *",
  },

  // ─── SALES (5) ──────────────────────────────────────────────────────────────
  {
    id: "nova",
    name: "Nova",
    department: "sales",
    role: "researcher",
    model: "sonnet",
    status: "idle",
    description:
      "Prospect Researcher. Finner 5 kvalifiserte klinikker daglig med fit-score, smertepunkt og inngangsvinkel. Sender til Hermes.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "0 7 * * 1-5",
  },
  {
    id: "hermes",
    name: "Hermes",
    department: "sales",
    role: "outreach",
    model: "sonnet",
    status: "idle",
    description:
      "Outreach Writer. Skriver personlige meldinger basert på Nova sin research. Ingen mal — hver melding er unik og kontekstspesifikk.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "event-driven",
  },
  {
    id: "titan",
    name: "Titan",
    department: "sales",
    role: "closer",
    model: "sonnet",
    status: "idle",
    description:
      "Deal Closer. Håndterer oppfølgingssekvenser, bygger innvendingssvar og forbereder Markus til å lukke deals.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "0 8 * * 1-5",
  },
  {
    id: "pulse",
    name: "Pulse",
    department: "sales",
    role: "crm",
    model: "haiku",
    status: "idle",
    description:
      "CRM Keeper. Oppdaterer pipeline-status, rydder opp i stale leads og varsler når et prospekt har vært stille for lenge.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "0 17 * * 1-5",
  },
  {
    id: "rex",
    name: "Rex",
    department: "sales",
    role: "revenue",
    model: "sonnet",
    status: "idle",
    description:
      "Revenue Analyst. Analyserer pipeline-helse, konverteringsrater og prognostiserer månedlig ARR. Leverer ukentlig til Ledger.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "0 9 * * 5",
  },

  // ─── MARKETING (4) ──────────────────────────────────────────────────────────
  {
    id: "muse",
    name: "Muse",
    department: "marketing",
    role: "content",
    model: "sonnet",
    status: "idle",
    description:
      "Content Creator. Skriver blogginnlegg, LinkedIn-artikler og case studies basert på Oracle og Scribe sine funn.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "0 9 * * 2,4",
  },
  {
    id: "beacon",
    name: "Beacon",
    department: "marketing",
    role: "seo",
    model: "haiku",
    status: "idle",
    description:
      "SEO Analyst. Gjennomfører søkeordsanalyser, sjekker rangeringer og leverer optimaliseringsforslag til Muse.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "0 6 * * 1",
  },
  {
    id: "prism",
    name: "Prism",
    department: "marketing",
    role: "brand",
    model: "sonnet",
    status: "idle",
    description:
      "Brand Manager. Validerer at all outbound innhold treffer merkevaren. Reviewer Muse og Hermes sine leveranser.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "event-driven",
  },
  {
    id: "echo",
    name: "Echo",
    department: "marketing",
    role: "social",
    model: "haiku",
    status: "idle",
    description:
      "Social Distributor. Tilpasser og distribuerer Muse sitt innhold til riktig kanal og format — LinkedIn, Twitter, nyhetsbrev.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "event-driven",
  },

  // ─── ANALYTICS (4) ──────────────────────────────────────────────────────────
  {
    id: "scribe",
    name: "Scribe",
    department: "analytics",
    role: "analyst",
    model: "sonnet",
    status: "idle",
    description:
      "Conversation Analyst. Analyserer salgssamtaler ukentlig — finner innvendingsmønstre, vinnertemaer og friksjonspunkter.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "0 9 * * 1",
  },
  {
    id: "lens",
    name: "Lens",
    department: "analytics",
    role: "data",
    model: "sonnet",
    status: "idle",
    description:
      "Data Analyst. Overvåker KPI-dashbordet, oppdager anomalier og sender alert til Jarvis ved signifikante avvik.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "0 8 * * *",
  },
  {
    id: "sage",
    name: "Sage",
    department: "analytics",
    role: "market",
    model: "sonnet",
    status: "idle",
    description:
      "Market Intelligence. Overvåker konkurrenters priser, features og posisjonering. Leverer ukentlig rapport til Athena.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "0 7 * * 1",
  },
  {
    id: "quill",
    name: "Quill",
    department: "analytics",
    role: "synthesizer",
    model: "sonnet",
    status: "idle",
    description:
      "Report Synthesizer. Sammenstiller output fra alle analytikere til én executive summary. Leverer til Ledger daglig.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "0 17 * * *",
  },

  // ─── OPERATIONS (4) ─────────────────────────────────────────────────────────
  {
    id: "guardian",
    name: "Guardian",
    department: "operations",
    role: "guardian",
    model: "sonnet",
    status: "idle",
    description:
      "Uptime Monitor. Helsesjekker alle systemer hvert 5. minutt. Sender `guardian/alert` event ved nedetid eller høy responstid.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "*/5 * * * *",
  },
  {
    id: "vault",
    name: "Vault",
    department: "operations",
    role: "security",
    model: "sonnet",
    status: "idle",
    description:
      "Security Auditor. Skanner kode for sårbarheter, sjekker avhengigheter og leverer sikkerhetsrapport til Cipher og Patch.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "0 3 * * *",
  },
  {
    id: "flux",
    name: "Flux",
    department: "operations",
    role: "change",
    model: "haiku",
    status: "idle",
    description:
      "Change Manager. Logger alle system-endringer, evaluerer rollback-triggers og varsler Patch ved deployment-anomalier.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "event-driven",
  },
  {
    id: "kronos",
    name: "Kronos",
    department: "operations",
    role: "scheduler",
    model: "haiku",
    status: "idle",
    description:
      "Schedule Optimizer. Analyserer agent-kjøringer, oppdager konflikter og foreslår tidsplan-justeringer for maksimal effektivitet.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "0 5 * * 1",
  },

  // ─── FINANCE (3) ────────────────────────────────────────────────────────────
  {
    id: "ledger",
    name: "Ledger",
    department: "finance",
    role: "reporter",
    model: "sonnet",
    status: "idle",
    description:
      "Financial Reporter. Daglig brief kl. 06 med systemstatus, token-kostnader, revenue-pipeline og nøkkeltall.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "0 6 * * *",
  },
  {
    id: "mint",
    name: "Mint",
    department: "finance",
    role: "cost",
    model: "haiku",
    status: "idle",
    description:
      "Cost Optimizer. Sporer token-forbruk per agent, identifiserer dyre kjøringer og foreslår prompt-optimaliseringer.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "0 23 * * *",
  },
  {
    id: "volt",
    name: "Volt",
    department: "finance",
    role: "growth",
    model: "sonnet",
    status: "idle",
    description:
      "Growth Analyst. Måler retention, expansion revenue og aktiveringstakt. Flagger churn-risiko og vekstmuligheter.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "0 9 * * 5",
  },

  // ─── RESEARCH (3) ───────────────────────────────────────────────────────────
  {
    id: "darwin",
    name: "Darwin",
    department: "research",
    role: "product",
    model: "sonnet",
    status: "idle",
    description:
      "Product Researcher. Analyserer brukerfeedback, prioriterer features etter impact og leverer product brief til Forge.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "0 10 * * 1",
  },
  {
    id: "atlas",
    name: "Atlas",
    department: "research",
    role: "technical",
    model: "sonnet",
    status: "idle",
    description:
      "Technical Researcher. Evaluerer nye teknologier, skriver feasibility studies og foreslår arkitekturendringer til Jarvis.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "0 10 * * 3",
  },
  {
    id: "silo",
    name: "Silo",
    department: "research",
    role: "knowledge",
    model: "haiku",
    status: "idle",
    description:
      "Knowledge Manager. Bygger og vedlikeholder intern kunnskapsbase. Dokumenterer alle agent-runs og artifakter for fremtidige runs.",
    lastRunAt: null,
    runsToday: 0,
    schedule: "0 22 * * *",
  },
];

// ─── Derived helpers ─────────────────────────────────────────────────────────

export const AGENTS_BY_DEPARTMENT = MOCK_AGENTS.reduce(
  (acc, agent) => {
    if (!acc[agent.department]) acc[agent.department] = [];
    acc[agent.department].push(agent);
    return acc;
  },
  {} as Record<string, AgentCardData[]>
);

export const MOCK_RECENT_RUNS = [] as Array<{
  id: string;
  agentName: string;
  status: "completed" | "failed" | "running";
  startedAt: Date;
  durationMs: number | null;
  summary: string;
}>;
