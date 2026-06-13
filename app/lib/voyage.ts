// Voyage AI client — `voyage-4` embeddings (1024-dim) + `rerank-2.5`.
// Thin fetch wrappers with retry/backoff on rate limits and transient errors.

const VOYAGE_BASE = "https://api.voyageai.com/v1";
export const EMBED_MODEL = "voyage-4";
export const RERANK_MODEL = "rerank-2.5";
export const EMBED_DIM = 1024;

function apiKey(): string {
  const k = process.env.VOYAGE_API_KEY;
  if (!k) throw new Error("VOYAGE_API_KEY is not set");
  return k;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function voyageFetch<T>(path: string, body: unknown, attempt = 0): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${VOYAGE_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey()}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    // Network error (ETIMEDOUT, reset, abort) — retry with backoff.
    if (attempt < 5) {
      await sleep(Math.min(2000 * 2 ** attempt, 30_000));
      return voyageFetch<T>(path, body, attempt + 1);
    }
    throw err;
  }
  if (res.ok) return (await res.json()) as T;

  // Retry on rate limit / transient server errors with exponential backoff.
  if ((res.status === 429 || res.status >= 500) && attempt < 5) {
    const wait = Math.min(2000 * 2 ** attempt, 30_000) + Math.floor(attempt * 250);
    await sleep(wait);
    return voyageFetch<T>(path, body, attempt + 1);
  }
  const text = await res.text().catch(() => "");
  throw new Error(`Voyage ${path} HTTP ${res.status}: ${text.slice(0, 200)}`);
}

interface EmbedResponse {
  data: { embedding: number[]; index: number }[];
  usage?: { total_tokens: number };
}

/** Embed a batch of texts. `input_type` matters: documents at ingest, query at search. */
export async function embed(texts: string[], inputType: "document" | "query"): Promise<number[][]> {
  if (texts.length === 0) return [];
  const body = {
    model: EMBED_MODEL,
    input: texts,
    input_type: inputType,
    output_dimension: EMBED_DIM,
  };
  const res = await voyageFetch<EmbedResponse>("/embeddings", body);
  // Preserve input order regardless of how the API returns them.
  const out: number[][] = new Array(texts.length);
  for (const d of res.data) out[d.index] = d.embedding;
  return out;
}

/** Embed a single text. */
export async function embedOne(text: string, inputType: "document" | "query"): Promise<number[]> {
  const [v] = await embed([text], inputType);
  return v;
}

interface RerankResponse {
  data: { index: number; relevance_score: number }[];
}

export interface RerankResult {
  index: number;
  score: number;
}

/** Rerank documents against a query; returns indices into `documents`, best first. */
export async function rerank(
  query: string,
  documents: string[],
  topK?: number,
): Promise<RerankResult[]> {
  if (documents.length === 0) return [];
  const body = {
    model: RERANK_MODEL,
    query,
    documents,
    top_k: topK ?? documents.length,
    truncation: true,
  };
  const res = await voyageFetch<RerankResponse>("/rerank", body);
  return res.data
    .map((d) => ({ index: d.index, score: d.relevance_score }))
    .sort((a, b) => b.score - a.score);
}

/** Format a pgvector literal from an embedding array, e.g. "[0.1,0.2,...]". */
export function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}
