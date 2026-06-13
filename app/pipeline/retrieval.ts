import { getSql, withDbRetry } from "../db/client";
import { causeBucket } from "../lib/causeColor";
import type { Facets } from "../lib/facets";
import { embed, rerank, toVectorLiteral } from "../lib/voyage";
import { type ExclusionPlan, isForbidden } from "./exclusions";

// Candidate recall → rerank → diversify. The exclusion plan filters in SQL AND
// is re-applied as a JS scrub at the end, so forbidden orgs cannot leak.

export interface Candidate {
  ein: string;
  name: string;
  mission: string | null;
  description: string | null;
  cause: string | null;
  city: string | null;
  state: string | null;
  revenue: number | null;
  website: string | null;
  logoUrl: string | null;
  embeddingText: string | null;
  vecScore: number; // best cosine similarity across queries (0..1)
  trgm: boolean; // surfaced by the trigram name leg
  rerankScore?: number;
}

type Row = {
  ein: string;
  name: string;
  mission: string | null;
  description: string | null;
  cause: string | null;
  city: string | null;
  state: string | null;
  revenue: number | null;
  website: string | null;
  logo_url: string | null;
  embedding_text: string | null;
  sim: number;
};

const VECTOR_K = 50; // per query
const TRIGRAM_K = 15; // per query
const RERANK_POOL = 120;

/** Build the NOT-conditions for the exclusion plan as a single SQL fragment. */
function exclusionWhere(sql: ReturnType<typeof getSql>, plan: ExclusionPlan) {
  // biome-ignore lint/suspicious/noExplicitAny: postgres.js fragment type
  const conds: any[] = [sql`embedding is not null`];
  if (plan.excludedCauses.length) {
    conds.push(sql`(cause is null or cause <> all(${plan.excludedCauses}))`);
  }
  for (const p of plan.forbiddenPatterns) {
    const like = `%${p}%`;
    conds.push(sql`name not ilike ${like}`);
    conds.push(sql`(embedding_text is null or embedding_text not ilike ${like})`);
  }
  // AND-join
  return conds.reduce((acc, c) => (acc ? sql`${acc} and ${c}` : c));
}

async function vectorRecall(queryVec: number[], plan: ExclusionPlan): Promise<Row[]> {
  const lit = toVectorLiteral(queryVec);
  return withDbRetry(() => {
    const sql = getSql();
    const where = exclusionWhere(sql, plan);
    return sql<Row[]>`
      select ein, name, mission, description, cause, city, state, revenue, website, logo_url, embedding_text,
             1 - (embedding <=> ${lit}::vector) as sim
      from charities
      where ${where}
      order by embedding <=> ${lit}::vector
      limit ${VECTOR_K}
    `;
  });
}

async function trigramRecall(queryText: string, plan: ExclusionPlan): Promise<Row[]> {
  return withDbRetry(() => {
    const sql = getSql();
    const where = exclusionWhere(sql, plan);
    return sql<Row[]>`
      select ein, name, mission, description, cause, city, state, revenue, website, logo_url, embedding_text,
             similarity(name, ${queryText}) as sim
      from charities
      where ${where} and name % ${queryText}
      order by similarity(name, ${queryText}) desc
      limit ${TRIGRAM_K}
    `;
  });
}

function toCandidate(r: Row, vec: boolean, trgm: boolean): Candidate {
  return {
    ein: r.ein,
    name: r.name,
    mission: r.mission,
    description: r.description,
    cause: r.cause,
    city: r.city,
    state: r.state,
    revenue: r.revenue,
    website: r.website,
    logoUrl: r.logo_url,
    embeddingText: r.embedding_text,
    vecScore: vec ? r.sim : 0,
    trgm,
  };
}

/**
 * Candidate recall: union of vector recall over each retrieval query and a
 * trigram name leg over the raw query terms. Deduped by EIN, keeping the best
 * vector score. Trigram-only candidates are kept (they help exact name matches).
 */
export async function recall(queries: string[], plan: ExclusionPlan): Promise<Candidate[]> {
  const qs = queries.filter((q) => q.trim().length > 0).slice(0, 8);
  if (qs.length === 0) return [];

  const vectors = await embed(qs, "query");
  const byEin = new Map<string, Candidate>();

  const vecResults = await Promise.all(vectors.map((v) => vectorRecall(v, plan)));
  for (const rows of vecResults) {
    for (const r of rows) {
      const existing = byEin.get(r.ein);
      if (existing) existing.vecScore = Math.max(existing.vecScore, r.sim);
      else byEin.set(r.ein, toCandidate(r, true, false));
    }
  }

  const trgmResults = await Promise.all(qs.map((q) => trigramRecall(q, plan)));
  for (const rows of trgmResults) {
    for (const r of rows) {
      const existing = byEin.get(r.ein);
      if (existing) existing.trgm = true;
      else byEin.set(r.ein, toCandidate(r, false, true));
    }
  }

  return [...byEin.values()];
}

/** Compact text used for reranking — name + the most informative sentence(s). */
function rerankDoc(c: Candidate): string {
  const body = (c.mission || c.description || "").replace(/\s+/g, " ").trim().slice(0, 500);
  return `${c.name}. ${body}`;
}

/**
 * Rerank the candidate union with Voyage rerank-2.5 against a deterministic
 * intent line. Falls back to vector-score order if rerank fails (degradation path).
 */
export async function rerankCandidates(
  intentLine: string,
  candidates: Candidate[],
): Promise<Candidate[]> {
  if (candidates.length === 0) return [];
  const pool = [...candidates].sort((a, b) => b.vecScore - a.vecScore).slice(0, RERANK_POOL);

  try {
    const ranked = await rerank(intentLine, pool.map(rerankDoc));
    return ranked.map((r) => ({ ...pool[r.index], rerankScore: r.score }));
  } catch (err) {
    console.error(
      "[retrieval] rerank failed, falling back to vector order:",
      String(err).slice(0, 120),
    );
    return pool;
  }
}

function normName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|incorporated|foundation|fund|trust|society|association|the|of|for|and)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function nearDup(a: string, b: string): boolean {
  const ta = new Set(normName(a).split(" ").filter(Boolean));
  const tb = new Set(normName(b).split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return false;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const jaccard = inter / (ta.size + tb.size - inter);
  return jaccard >= 0.8;
}

export interface SelectOptions {
  n?: number;
  facets: Facets;
  plan: ExclusionPlan;
}

/**
 * Diversify & select the final N: re-scrub (belt and suspenders), near-dup
 * dedup, per-cause cap (only when the donor wants breadth), and a geo floor
 * that guarantees ≥2 in-state orgs when scope is local/regional.
 */
export function selectFinal(ranked: Candidate[], opts: SelectOptions): Candidate[] {
  const n = opts.n ?? 10;
  const { facets, plan } = opts;

  const clean = ranked.filter(
    (c) => !isForbidden({ name: c.name, cause: c.cause, embeddingText: c.embeddingText }, plan),
  );

  const buckets = new Set(facets.causes.map((c) => causeBucket(c)));
  const wantsBreadth = facets.strategy === "broaden" && buckets.size > 1;
  const causeCap = wantsBreadth ? Math.max(2, Math.ceil(n / buckets.size) + 1) : n;

  const selected: Candidate[] = [];
  const perCause = new Map<string, number>();

  const tryAdd = (c: Candidate): boolean => {
    if (selected.length >= n) return false;
    if (selected.some((s) => s.ein === c.ein)) return false;
    if (selected.some((s) => nearDup(s.name, c.name))) return false;
    const bucket = causeBucket(c.cause);
    if ((perCause.get(bucket) ?? 0) >= causeCap) return false;
    selected.push(c);
    perCause.set(bucket, (perCause.get(bucket) ?? 0) + 1);
    return true;
  };

  for (const c of clean) tryAdd(c);

  // Geo floor: ensure ≥2 in-state orgs when the donor's scope is local/regional.
  const targetState = facets.geo.state;
  const wantsLocal = facets.geo.scope === "local" || facets.geo.scope === "regional";
  if (targetState && wantsLocal) {
    const inState = selected.filter((s) => s.state === targetState).length;
    const need = Math.min(2, clean.filter((c) => c.state === targetState).length) - inState;
    if (need > 0) {
      const localCandidates = clean.filter(
        (c) => c.state === targetState && !selected.some((s) => s.ein === c.ein),
      );
      for (let i = 0; i < need && localCandidates.length > 0; i++) {
        const add = localCandidates.shift();
        if (!add) break;
        // Drop the lowest-ranked non-in-state org to make room.
        for (let j = selected.length - 1; j >= 0; j--) {
          if (selected[j].state !== targetState) {
            selected.splice(j, 1);
            break;
          }
        }
        if (!selected.some((s) => nearDup(s.name, add.name))) selected.push(add);
      }
    }
  }

  return selected.slice(0, n);
}
