import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// Anthropic client + helpers. Every structured call forces a tool and validates
// the result with Zod safeParse — a malformed LLM reply returns null and the
// caller degrades gracefully (BRIEF.md: "never throws to the user").

export const MODEL = "claude-opus-4-8";

let _client: Anthropic | undefined;
export function anthropic(): Anthropic {
  if (!_client) {
    // Generous retries + timeout absorb transient connection blips (the SDK
    // retries connection errors / 429 / 5xx with backoff).
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 4,
      timeout: 120_000,
    });
  }
  return _client;
}

/** Convert a Zod schema to a JSON Schema usable as an Anthropic tool input_schema. */
export function toToolSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: "draft-7", io: "output" }) as Record<
    string,
    unknown
  >;
  json.$schema = undefined;
  delete json.$schema;
  return json;
}

// Opus 4.8 controls reasoning depth/cost via effort (temperature/top_p are
// removed and 400). Keep extraction fast and report prose thorough.
export type Effort = "low" | "medium" | "high";

interface StructuredOpts<T> {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  toolName: string;
  toolDescription?: string;
  maxTokens?: number;
  effort?: Effort;
  /** Number of validation retries before giving up (default 1). */
  retries?: number;
}

/**
 * Force a single tool call whose input matches `schema`, returning the parsed
 * object — or null if the model never produced valid input after retries.
 */
export async function structured<T>(opts: StructuredOpts<T>): Promise<T | null> {
  const {
    system,
    prompt,
    schema,
    toolName,
    toolDescription,
    maxTokens = 2048,
    effort = "medium",
    retries = 1,
  } = opts;
  const inputSchema = toToolSchema(schema);

  let lastErr = "";
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await anthropic().messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      output_config: { effort },
      system,
      tools: [
        {
          name: toolName,
          description: toolDescription ?? `Return the structured result as ${toolName}.`,
          input_schema: inputSchema as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: toolName },
      messages: [
        {
          role: "user",
          content:
            attempt === 0
              ? prompt
              : `${prompt}\n\n(Your previous reply did not validate: ${lastErr}. Return only valid input for ${toolName}.)`,
        },
      ],
    });
    const block = res.content.find((b) => b.type === "tool_use");
    if (block?.type !== "tool_use") {
      lastErr = "no tool_use block";
      continue;
    }
    const parsed = schema.safeParse(block.input);
    if (parsed.success) return parsed.data;
    lastErr = parsed.error.issues
      .slice(0, 4)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
  }
  console.error(`[anthropic.structured] ${toolName} failed validation: ${lastErr}`);
  return null;
}

/** Plain non-streamed completion returning concatenated text. */
export async function text(opts: {
  system: string;
  prompt: string;
  maxTokens?: number;
  effort?: Effort;
}): Promise<string> {
  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 1024,
    output_config: { effort: opts.effort ?? "medium" },
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

export interface WebSearchResult {
  text: string;
  citations: { url: string; title: string }[];
}

/**
 * One web-search-grounded answer. Used for per-charity news (progressive,
 * concurrency-capped). Returns null on any error so news never blocks the report.
 */
export async function webSearch(opts: {
  prompt: string;
  system?: string;
  maxUses?: number;
  maxTokens?: number;
}): Promise<WebSearchResult | null> {
  try {
    const res = await anthropic().messages.create({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 1024,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: opts.maxUses ?? 3,
        } as unknown as Anthropic.Tool,
      ],
    });

    let out = "";
    const citations: { url: string; title: string }[] = [];
    for (const block of res.content) {
      if (block.type === "text") {
        out += block.text;
        const cites = (block as { citations?: { url?: string; title?: string }[] }).citations;
        if (Array.isArray(cites)) {
          for (const c of cites) {
            if (c.url) citations.push({ url: c.url, title: c.title ?? c.url });
          }
        }
      }
    }
    return { text: out.trim(), citations };
  } catch (err) {
    console.error("[anthropic.webSearch] failed:", String(err).slice(0, 160));
    return null;
  }
}
