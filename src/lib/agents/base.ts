import Anthropic from "@anthropic-ai/sdk";
import { anthropic, pickModel, estimateCostMicroUsd } from "@/lib/anthropic/client";
import type {
  AgentContext,
  AgentDefinition,
  AgentInput,
  AgentOutput,
  AgentTool,
} from "./types";

/**
 * BaseAgent — the runtime contract every agent inherits.
 *
 * Concrete agents (Jarvis, Nova, etc.) declare their definition and override
 * `run()` if they need custom logic. The default `run()` is a one-shot Claude
 * call with tool support — good enough for most agents.
 *
 * The runtime layer (Inngest function) is what actually:
 *   - creates the agent_runs row
 *   - injects the AgentContext (orgId, runId, log())
 *   - persists output, artifacts, events, and usage
 *
 * BaseAgent itself stays pure-ish: given a context and input, return output.
 */
export abstract class BaseAgent {
  abstract definition: AgentDefinition;

  get model() {
    return pickModel(this.definition.model);
  }

  protected toolsAsAnthropicSchema() {
    return this.definition.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as never,
    }));
  }

  protected getTool(name: string): AgentTool | undefined {
    return this.definition.tools.find((t) => t.name === name);
  }

  /**
   * Wraps a single Anthropic API call with exponential backoff for 429s.
   * Waits 5s, 10s, 20s before giving up.
   */
  private async callWithRetry(
    params: Anthropic.MessageCreateParamsNonStreaming
  ): Promise<Anthropic.Message> {
    const delays = [5000, 10000, 20000];
    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        return await anthropic.messages.create(
          params,
          { signal: AbortSignal.timeout(30_000) }
        ) as Anthropic.Message;
      } catch (err) {
        const isRateLimit =
          err instanceof Error &&
          (err.message.includes("429") ||
            err.message.toLowerCase().includes("rate_limit") ||
            err.message.toLowerCase().includes("rate limit") ||
            (err as { status?: number }).status === 429);

        if (isRateLimit && attempt < delays.length) {
          const wait = delays[attempt]!;
          console.warn(
            `[${this.definition.name}] Rate limit (429) — venter ${wait / 1000}s (forsøk ${attempt + 1}/${delays.length})`
          );
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
        throw err;
      }
    }
    // unreachable, but satisfies TypeScript
    throw new Error("callWithRetry: alle forsøk feilet");
  }

  /**
   * Default run loop: call Claude, handle tool calls iteratively, return
   * a final summary. Override for fully custom flows (e.g. multi-step
   * pipelines that don't fit a chat-with-tools model).
   */
  async run(input: AgentInput, ctx: AgentContext): Promise<AgentOutput> {
    const messages: Array<{
      role: "user" | "assistant";
      content: unknown;
    }> = [
      {
        role: "user",
        content: input.message ?? JSON.stringify(input.data ?? {}, null, 2),
      },
    ];

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let finalText = "";

    // Cap iterations so a runaway tool loop can't burn through tokens.
    for (let iter = 0; iter < 10; iter++) {
      // Use higher token limits for larger models — Opus/Sonnet support up to 32k output.
      // Haiku gets 4k (fast, cost-effective); Sonnet gets 8k; Opus gets 16k.
      const maxTokensForModel =
        this.model.includes("opus") ? 16000 :
        this.model.includes("haiku") ? 4096 : 8000;

      const response = await this.callWithRetry({
        model: this.model,
        max_tokens: maxTokensForModel,
        system: this.definition.systemPrompt,
        tools: this.toolsAsAnthropicSchema(),
        stream: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: messages as any,
      });

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      // Collect text + any tool uses from this turn.
      const textBlocks = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text);
      const toolUses = response.content.filter((b) => b.type === "tool_use");

      finalText = textBlocks.join("\n").trim() || finalText;

      if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
        break;
      }

      messages.push({ role: "assistant", content: response.content });

      const toolResults: Array<{
        type: "tool_result";
        tool_use_id: string;
        content: string;
      }> = [];

      for (const block of toolUses) {
        const tu = block as {
          type: "tool_use";
          id: string;
          name: string;
          input: unknown;
        };
        await ctx.log("tool_call", {
          title: tu.name,
          input: tu.input as Record<string, unknown>,
        });

        const tool = this.getTool(tu.name);
        let result: unknown;
        try {
          if (!tool) throw new Error(`Unknown tool: ${tu.name}`);
          result = await tool.handler(tu.input, ctx);
        } catch (err) {
          result = {
            error: err instanceof Error ? err.message : String(err),
          };
        }

        await ctx.log("tool_result", {
          title: tu.name,
          output: result as Record<string, unknown>,
        });

        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content:
            typeof result === "string" ? result : JSON.stringify(result),
        });
      }

      messages.push({ role: "user", content: toolResults });
    }

    return {
      summary: finalText || "(no output)",
      usage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      },
    };
  }

  /** Cost estimate for a usage tuple, for logging into agent_runs. */
  estimateCost(inputTokens: number, outputTokens: number): number {
    return estimateCostMicroUsd(
      this.definition.model,
      inputTokens,
      outputTokens
    );
  }
}
