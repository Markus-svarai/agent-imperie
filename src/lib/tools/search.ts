import { tavily } from "@tavily/core";

/**
 * Web search utility powered by Tavily.
 * Returns clean, formatted text ready to inject into agent prompts.
 * Never throws — returns empty string on error so agents degrade gracefully.
 */

let _client: ReturnType<typeof tavily> | null = null;

function getClient() {
  if (!_client) {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) throw new Error("TAVILY_API_KEY not set");
    _client = tavily({ apiKey });
  }
  return _client;
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

/**
 * Run a single search query.
 * Returns formatted markdown-style text for embedding in prompts.
 */
export async function search(
  query: string,
  options: { maxResults?: number; days?: number } = {}
): Promise<string> {
  try {
    const client = getClient();
    const { maxResults = 5, days = 7 } = options;

    const response = await client.search(query, {
      maxResults,
      days,
      includeAnswer: false,
    });

    if (!response.results?.length) return "(ingen resultater)";

    return response.results
      .map(
        (r, i) =>
          `[${i + 1}] **${r.title}**\nKilde: ${r.url}\n${r.content?.slice(0, 500) ?? ""}`
      )
      .join("\n\n");
  } catch (err) {
    console.error("[search] Feil:", err);
    return "(søk utilgjengelig)";
  }
}

/**
 * Run multiple queries in parallel. Returns a record of query → result.
 */
export async function searchMany(
  queries: Record<string, string>,
  options: { maxResults?: number; days?: number } = {}
): Promise<Record<string, string>> {
  const entries = Object.entries(queries);
  const results = await Promise.allSettled(
    entries.map(([, query]) => search(query, options))
  );

  return Object.fromEntries(
    entries.map(([key], i) => [
      key,
      results[i].status === "fulfilled" ? results[i].value : "(søk feilet)",
    ])
  );
}
