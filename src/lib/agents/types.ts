import type { ModelTier } from "@/lib/anthropic/client";

/**
 * Tools an agent can call. Each tool has a JSON-Schema-ish input shape and a
 * handler that runs server-side. Keep tools small and composable — most
 * agents only need 2-5.
 */
export interface AgentTool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (input: TInput, ctx: AgentContext) => Promise<TOutput>;
}

/**
 * What the runtime hands an agent on every run. Holds the org boundary so
 * tools can scope their queries, plus a logger that writes to `run_steps`.
 */
export interface AgentContext {
  orgId: string;
  agentId: string;
  runId: string;
  /** Append a step to run_steps. Returns the step id. */
  log: (
    type: "thought" | "tool_call" | "tool_result" | "output" | "error",
    payload: { title?: string; input?: unknown; output?: unknown }
  ) => Promise<string>;
}

export interface AgentInput {
  /** Free-form input — what triggered this run. */
  message?: string;
  data?: Record<string, unknown>;
  /** If invoked by another agent, that agent's run id. */
  parentRunId?: string;
}

export interface AgentOutput {
  /** Human-readable summary written to agent_runs.output. */
  summary: string;
  /** Structured payload — anything downstream needs. */
  data?: Record<string, unknown>;
  /** Artifacts to persist to the artifacts table. */
  artifacts?: Array<{
    type:
      | "report"
      | "outreach_message"
      | "prospect_list"
      | "code_diff"
      | "summary"
      | "alert"
      | "other";
    title: string;
    content?: string;
    data?: Record<string, unknown>;
    url?: string;
  }>;
  /** Events to emit (e.g. dispatch another agent). */
  events?: Array<{
    type:
      | "agent.dispatch"
      | "agent.completed"
      | "agent.failed"
      | "system.alert"
      | "user.action"
      | "external";
    targetAgentId?: string;
    payload?: Record<string, unknown>;
  }>;
  /** Token usage from the LLM call(s). */
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * The contract every agent honors. Concrete agents extend BaseAgent
 * (see ./base.ts) which fills in the runtime plumbing and leaves only
 * `run()` for the agent to implement.
 */
export interface AgentDefinition {
  name: string;
  department:
    | "command"
    | "engineering"
    | "sales"
    | "marketing"
    | "analytics"
    | "operations"
    | "finance"
    | "research";
  role:
    | "orchestrator" | "strategist" | "intelligence" | "coordinator"
    | "engineer" | "reviewer" | "qa" | "devops" | "developer"
    | "researcher" | "outreach" | "closer" | "crm" | "revenue"
    | "content" | "seo" | "brand" | "social"
    | "analyst" | "data" | "market" | "synthesizer"
    | "guardian" | "security" | "change" | "scheduler"
    | "reporter" | "cost" | "growth"
    | "product" | "technical" | "knowledge"
    | "custom";
  model: ModelTier;
  description: string;
  systemPrompt: string;
  /** cron expression, or undefined for event-driven only */
  schedule?: string;
  tools: AgentTool[];
}
