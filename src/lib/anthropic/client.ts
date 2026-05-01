import Anthropic from "@anthropic-ai/sdk";

/**
 * Single shared Anthropic client. We route models through `pickModel` so the
 * rest of the codebase never hardcodes a model string — agents declare their
 * tier and the router picks the actual model name.
 */
const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey && process.env.NODE_ENV !== "test") {
  // Don't throw at import time — let server actions surface the error.
  console.warn("[anthropic] ANTHROPIC_API_KEY is not set");
}

export const anthropic = new Anthropic({ apiKey: apiKey ?? "missing" });

export type ModelTier = "opus" | "sonnet" | "haiku";

const MODEL_MAP: Record<ModelTier, string> = {
  opus: "claude-opus-4-6",
  sonnet: "claude-sonnet-4-6",
  haiku: "claude-haiku-4-5-20251001",
};

export function pickModel(tier: ModelTier): string {
  return MODEL_MAP[tier];
}

/**
 * Approximate prices in micro-USD per token (USD * 1_000_000 / 1_000_000 tokens).
 * Update when Anthropic publishes new pricing. Stored as integers to avoid
 * float drift when summing many tiny costs.
 */
const COST_TABLE: Record<ModelTier, { input: number; output: number }> = {
  opus: { input: 15, output: 75 },
  sonnet: { input: 3, output: 15 },
  haiku: { input: 1, output: 5 },
};

export function estimateCostMicroUsd(
  tier: ModelTier,
  inputTokens: number,
  outputTokens: number
): number {
  const rate = COST_TABLE[tier];
  return inputTokens * rate.input + outputTokens * rate.output;
}
