import { z } from "zod";
import { structured, webSearch } from "../lib/anthropic";
import type { NewsItem } from "../lib/types";

// Per-charity news grounding (BRIEF.md differentiator). Progressive + cache-first
// + concurrency-capped at the call site. Uses Claude's web_search tool, then
// distills one grounded sentence with a real source. Never throws — returns null
// so news is a progressive enhancement that can't block the report.

const cache = new Map<string, NewsItem | null>();

const DistillSchema = z.object({
  line: z.string(),
  sourceUrl: z.string(),
  sourceTitle: z.string(),
  grounded: z.boolean(),
});

export async function fetchCharityNews(charity: {
  ein: string;
  name: string;
  city?: string | null;
  state?: string | null;
}): Promise<NewsItem | null> {
  if (cache.has(charity.ein)) return cache.get(charity.ein) ?? null;

  const where = [charity.city, charity.state].filter(Boolean).join(", ");
  const search = await webSearch({
    prompt: `Find one recent, specific thing the nonprofit "${charity.name}"${where ? ` (${where})` : ""} is doing or has announced — a program, milestone, campaign, or impact. Summarize what they're doing now in one concrete sentence and note the source.`,
    maxUses: 3,
    maxTokens: 900,
  });

  if (!search?.text) {
    cache.set(charity.ein, null);
    return null;
  }

  const firstCite = search.citations[0];
  // Distill the search result into a clean one-liner + pick the best source.
  const distilled = await structured({
    system:
      "You distill a web-search result about a nonprofit into one factual, specific sentence (≤ 26 words) about what they are currently doing. Use ONLY the provided text — do not invent. Set grounded=false if the text has no concrete, on-topic information about this organization. Call the `news` tool.",
    prompt: `Organization: ${charity.name}\n\nSearch result text:\n${search.text}\n\nAvailable sources:\n${search.citations.map((c) => `- ${c.title}: ${c.url}`).join("\n") || "(none)"}\n\nReturn the one-line summary, the most relevant source URL + title, and whether it is grounded.`,
    schema: DistillSchema,
    toolName: "news",
    maxTokens: 400,
    effort: "low",
  });

  let result: NewsItem | null = null;
  if (distilled?.grounded && distilled.line.trim()) {
    result = {
      line: distilled.line.trim(),
      sourceUrl: distilled.sourceUrl || firstCite?.url || "",
      sourceTitle: distilled.sourceTitle || firstCite?.title || "source",
    };
    if (!result.sourceUrl) result = null; // require a real source
  }

  cache.set(charity.ein, result);
  return result;
}

/** Fetch news for many charities with a concurrency cap (default 4). */
export async function fetchNewsBatch(
  charities: { ein: string; name: string; city?: string | null; state?: string | null }[],
  concurrency = 4,
): Promise<Record<string, NewsItem | null>> {
  const out: Record<string, NewsItem | null> = {};
  let cursor = 0;
  async function worker() {
    while (cursor < charities.length) {
      const c = charities[cursor++];
      out[c.ein] = await fetchCharityNews(c);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, charities.length) }, worker));
  return out;
}
