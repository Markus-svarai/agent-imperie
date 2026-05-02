import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  bigint,
  jsonb,
  boolean,
  pgEnum,
  index,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Agent Imperie — database schema
 *
 * Multi-tenant from day one. Every domain table carries `org_id` so we can
 * either keep it single-org for now, or open it up to other teams without a
 * migration nightmare later.
 *
 * Five core tables: orgs, users, agents, agent_runs, run_steps,
 * artifacts, events. Anything else is a leaf detail.
 */

// ---------- enums ----------

export const userRoleEnum = pgEnum("user_role", [
  "owner",
  "admin",
  "member",
  "viewer",
]);

export const departmentEnum = pgEnum("department", [
  "command",      // C-Suite
  "engineering",  // Dev team
  "sales",        // Revenue pipeline
  "marketing",    // Content & growth
  "analytics",    // Data & intelligence
  "operations",   // Infra & security
  "finance",      // Costs & metrics
  "research",     // Product & tech R&D
]);

export const agentRoleEnum = pgEnum("agent_role", [
  // Command
  "orchestrator",  // Jarvis
  "strategist",    // Athena
  "intelligence",  // Oracle
  "coordinator",   // Nexus
  // Engineering
  "engineer",      // Forge
  "reviewer",      // Cipher
  "qa",            // Sentinel
  "devops",        // Patch
  "developer",     // Dev
  // Sales
  "researcher",    // Nova
  "outreach",      // Hermes
  "closer",        // Titan
  "crm",           // Pulse
  "revenue",       // Rex
  // Marketing
  "content",       // Muse
  "seo",           // Beacon
  "brand",         // Prism
  "social",        // Echo
  // Analytics
  "analyst",       // Scribe
  "data",          // Lens
  "market",        // Sage
  "synthesizer",   // Quill
  // Operations
  "guardian",      // Guardian
  "security",      // Vault
  "change",        // Flux
  "scheduler",     // Kronos
  // Finance
  "reporter",      // Ledger
  "cost",          // Mint
  "growth",        // Volt
  // Research
  "product",       // Darwin
  "technical",     // Atlas
  "knowledge",     // Silo
  "custom",
]);

export const agentStatusEnum = pgEnum("agent_status", [
  "idle",
  "active",
  "paused",
  "error",
  "archived",
]);

export const modelEnum = pgEnum("model", [
  "claude-opus-4-6",
  "claude-sonnet-4-6",
  "claude-haiku-4-5-20251001",
]);

export const runStatusEnum = pgEnum("run_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const runTriggerEnum = pgEnum("run_trigger", [
  "manual",
  "schedule",
  "event",
  "agent",
]);

export const stepTypeEnum = pgEnum("step_type", [
  "thought",
  "tool_call",
  "tool_result",
  "output",
  "error",
]);

export const artifactTypeEnum = pgEnum("artifact_type", [
  "report",
  "outreach_message",
  "prospect_list",
  "code_diff",
  "summary",
  "alert",
  "other",
]);

export const eventTypeEnum = pgEnum("event_type", [
  "agent.dispatch",
  "agent.completed",
  "agent.failed",
  "system.alert",
  "user.action",
  "external",
]);

// ---------- orgs & users ----------

export const orgs = pgTable("orgs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(), // matches Supabase auth.users.id
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name"),
    role: userRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("users_org_idx").on(t.orgId),
  })
);

// ---------- agents ----------

export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // "Jarvis", "Nova", etc.
    department: departmentEnum("department").notNull().default("command"),
    role: agentRoleEnum("role").notNull(),
    model: modelEnum("model").notNull(),
    description: text("description"),
    systemPrompt: text("system_prompt").notNull(),
    /** cron expression, or null for event-driven only */
    schedule: text("schedule"),
    /** arbitrary config — tool params, thresholds, prompts, etc. */
    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    status: agentStatusEnum("status").notNull().default("idle"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("agents_org_idx").on(t.orgId),
    statusIdx: index("agents_status_idx").on(t.status),
  })
);

// ---------- agent runs ----------

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    status: runStatusEnum("status").notNull().default("queued"),
    trigger: runTriggerEnum("trigger").notNull(),
    /** if triggered by another agent, which one */
    parentRunId: uuid("parent_run_id"),
    input: jsonb("input").$type<Record<string, unknown>>(),
    output: jsonb("output").$type<Record<string, unknown>>(),
    error: text("error"),
    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at"),
    durationMs: integer("duration_ms"),
    inputTokens: integer("input_tokens").default(0),
    outputTokens: integer("output_tokens").default(0),
    /** stored in micro-USD to avoid float headaches */
    costMicroUsd: bigint("cost_micro_usd", { mode: "number" }).default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("runs_org_idx").on(t.orgId),
    agentIdx: index("runs_agent_idx").on(t.agentId),
    statusIdx: index("runs_status_idx").on(t.status),
    createdIdx: index("runs_created_idx").on(t.createdAt),
  })
);

// ---------- run steps (per-step trace inside a run) ----------

export const runSteps = pgTable(
  "run_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => agentRuns.id, { onDelete: "cascade" }),
    stepNumber: integer("step_number").notNull(),
    type: stepTypeEnum("type").notNull(),
    title: text("title"),
    input: jsonb("input").$type<Record<string, unknown>>(),
    output: jsonb("output").$type<Record<string, unknown>>(),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    runIdx: index("steps_run_idx").on(t.runId),
  })
);

// ---------- artifacts (what agents produce) ----------

export const artifacts = pgTable(
  "artifacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    runId: uuid("run_id").references(() => agentRuns.id, {
      onDelete: "set null",
    }),
    agentId: uuid("agent_id").references(() => agents.id, {
      onDelete: "set null",
    }),
    type: artifactTypeEnum("type").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    /** structured payload — what makes this artifact useful */
    data: jsonb("data").$type<Record<string, unknown>>(),
    url: text("url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("artifacts_org_idx").on(t.orgId),
    runIdx: index("artifacts_run_idx").on(t.runId),
    typeIdx: index("artifacts_type_idx").on(t.type),
  })
);

// ---------- leads (sales pipeline) ----------

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "replied",
  "interested",
  "demo_booked",
  "customer",
  "not_interested",
  "no_reply",       // contacted but no response after 7 days
  "unsubscribed",
]);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    companyName: text("company_name").notNull(),
    contactName: text("contact_name"),
    email: text("email"),
    phone: text("phone"),
    website: text("website"),
    specialty: text("specialty"), // tannlege, lege, hudklinikk etc.
    location: text("location"),
    status: leadStatusEnum("status").notNull().default("new"),
    source: text("source").default("nova"),
    notes: text("notes"),
    fitScore: integer("fit_score"),
    lastContactedAt: timestamp("last_contacted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("leads_org_idx").on(t.orgId),
    statusIdx: index("leads_status_idx").on(t.status),
    emailIdx: index("leads_email_idx").on(t.email),
  })
);

export const outreachEmails = pgTable(
  "outreach_emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    direction: text("direction").notNull().default("outbound"), // "outbound" | "inbound"
    fromEmail: text("from_email").notNull(),
    toEmail: text("to_email").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    resendMessageId: text("resend_message_id"),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("outreach_org_idx").on(t.orgId),
    leadIdx: index("outreach_lead_idx").on(t.leadId),
    directionIdx: index("outreach_direction_idx").on(t.direction),
  })
);

// ---------- events (inter-agent + system signals) ----------

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    type: eventTypeEnum("type").notNull(),
    sourceAgentId: uuid("source_agent_id").references(() => agents.id, {
      onDelete: "set null",
    }),
    targetAgentId: uuid("target_agent_id").references(() => agents.id, {
      onDelete: "set null",
    }),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("events_org_idx").on(t.orgId),
    typeIdx: index("events_type_idx").on(t.type),
    targetIdx: index("events_target_idx").on(t.targetAgentId),
  })
);

// ---------- agent memory (long-term learnings per agent) ----------

export const agentMemory = pgTable(
  "agent_memory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    /** agent name, e.g. "nova", "hermes", "titan" */
    agentId: text("agent_id").notNull(),
    /** e.g. "rejection_patterns", "successful_approaches", "icp_learnings" */
    key: text("key").notNull(),
    /** the actual learning — array, object, or string */
    value: jsonb("value").notNull(),
    /** 0.0–1.0 — how confident is the agent in this memory */
    confidence: numeric("confidence", { precision: 3, scale: 2 }).default("1.0"),
    /** which run generated/updated this memory */
    sourceRunId: uuid("source_run_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    orgAgentKeyIdx: index("memory_org_agent_key_idx").on(t.orgId, t.agentId, t.key),
    agentIdx: index("memory_agent_idx").on(t.agentId),
  })
);

// ---------- strategy proposals (Athena's ideas for Markus) ----------

export const strategyProposals = pgTable(
  "strategy_proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    createdBy: text("created_by").notNull(), // agent name
    runId: uuid("run_id").references(() => agentRuns.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    /** [{area, problem, suggestion, priority: "high"|"medium"|"low"}] */
    proposals: jsonb("proposals").$type<Array<{
      area: string;
      problem: string;
      suggestion: string;
      priority: "high" | "medium" | "low";
    }>>().default([]),
    /** "pending" | "reviewed" | "implemented" | "dismissed" */
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("proposals_org_idx").on(t.orgId),
    statusIdx: index("proposals_status_idx").on(t.status),
    createdIdx: index("proposals_created_idx").on(t.createdAt),
  })
);

// ---------- relations ----------

export const orgsRelations = relations(orgs, ({ many }) => ({
  users: many(users),
  agents: many(agents),
  runs: many(agentRuns),
  artifacts: many(artifacts),
  events: many(events),
}));

export const usersRelations = relations(users, ({ one }) => ({
  org: one(orgs, { fields: [users.orgId], references: [orgs.id] }),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  org: one(orgs, { fields: [agents.orgId], references: [orgs.id] }),
  runs: many(agentRuns),
  artifacts: many(artifacts),
}));

export const agentRunsRelations = relations(agentRuns, ({ one, many }) => ({
  org: one(orgs, { fields: [agentRuns.orgId], references: [orgs.id] }),
  agent: one(agents, { fields: [agentRuns.agentId], references: [agents.id] }),
  steps: many(runSteps),
  artifacts: many(artifacts),
}));

export const runStepsRelations = relations(runSteps, ({ one }) => ({
  run: one(agentRuns, { fields: [runSteps.runId], references: [agentRuns.id] }),
}));

export const artifactsRelations = relations(artifacts, ({ one }) => ({
  org: one(orgs, { fields: [artifacts.orgId], references: [orgs.id] }),
  run: one(agentRuns, { fields: [artifacts.runId], references: [agentRuns.id] }),
  agent: one(agents, { fields: [artifacts.agentId], references: [agents.id] }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  org: one(orgs, { fields: [events.orgId], references: [orgs.id] }),
  source: one(agents, {
    fields: [events.sourceAgentId],
    references: [agents.id],
    relationName: "source",
  }),
  target: one(agents, {
    fields: [events.targetAgentId],
    references: [agents.id],
    relationName: "target",
  }),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  org: one(orgs, { fields: [leads.orgId], references: [orgs.id] }),
  emails: many(outreachEmails),
}));

export const outreachEmailsRelations = relations(outreachEmails, ({ one }) => ({
  org: one(orgs, { fields: [outreachEmails.orgId], references: [orgs.id] }),
  lead: one(leads, { fields: [outreachEmails.leadId], references: [leads.id] }),
  agent: one(agents, { fields: [outreachEmails.agentId], references: [agents.id] }),
}));

// ---------- type exports ----------

export type Org = typeof orgs.$inferSelect;
export type User = typeof users.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type AgentRun = typeof agentRuns.$inferSelect;
export type NewAgentRun = typeof agentRuns.$inferInsert;
export type RunStep = typeof runSteps.$inferSelect;
export type Artifact = typeof artifacts.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type OutreachEmail = typeof outreachEmails.$inferSelect;
export type AgentMemory = typeof agentMemory.$inferSelect;
export type StrategyProposal = typeof strategyProposals.$inferSelect;
