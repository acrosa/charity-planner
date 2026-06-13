/**
 * Ingest pipeline (BRIEF.md §Data-is-queryable).
 *
 *   1. Stream + Zod-parse dataset/charities_10k.jsonl, skip both-null rows.
 *   2. Build embedding_text (name + mission + description + cause/geo) + content_hash.
 *   3. Batch-embed via Voyage voyage-4 (input_type=document), with pacing + retry.
 *   4. Per-batch durable upsert into the charities table (idempotent on content_hash).
 *   5. Write output/ingest_report.json + output/failed_records.jsonl.
 *   6. Verify: rows + non-null embeddings + corpus >= 95%.
 *
 * Run: pnpm ingest   (reads .env.local for DATABASE_URL + VOYAGE_API_KEY)
 */
import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { z } from "zod";
import { makeSql } from "../app/db/client";
import {
  buildEmbeddingText,
  contentHash,
  isBothNull,
  type RawCharity,
} from "../app/pipeline/embeddingText";
import { embed, EMBED_DIM, toVectorLiteral } from "../app/lib/voyage";

const DATASET = "dataset/charities_10k.jsonl";
const BATCH = 64; // docs per Voyage embed request
const CONCURRENCY = 4; // simultaneous embed+upsert batches

const RawSchema = z.object({
  ein: z.union([z.string(), z.number()]).transform((v) => String(v).trim()),
  name: z.string().min(1),
  mission: z.string().nullish(),
  description: z.string().nullish(),
  cause: z.string().nullish(),
  city: z.string().nullish(),
  state: z.string().nullish(),
  revenue: z.number().nullish(),
  website: z.string().nullish(),
  logo_url: z.string().nullish(),
});

interface Prepared extends RawCharity {
  embeddingText: string;
  hash: string;
}

async function loadRecords(): Promise<{ prepared: Prepared[]; skippedBothNull: number; parseErrors: number }> {
  const rl = createInterface({ input: createReadStream(DATASET), crlfDelay: Infinity });
  const prepared: Prepared[] = [];
  const seen = new Set<string>();
  let skippedBothNull = 0;
  let parseErrors = 0;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let json: unknown;
    try {
      json = JSON.parse(trimmed);
    } catch {
      parseErrors++;
      continue;
    }
    const parsed = RawSchema.safeParse(json);
    if (!parsed.success) {
      parseErrors++;
      continue;
    }
    const c = parsed.data as RawCharity;
    if (isBothNull(c)) {
      skippedBothNull++;
      continue;
    }
    if (seen.has(c.ein)) continue; // dedupe by EIN
    seen.add(c.ein);
    const embeddingText = buildEmbeddingText(c);
    prepared.push({ ...c, embeddingText, hash: contentHash(embeddingText) });
  }
  return { prepared, skippedBothNull, parseErrors };
}

type Sql = ReturnType<typeof makeSql>;

async function upsertBatch(sql: Sql, rows: Prepared[], vectors: number[][]) {
  const values = rows.map((r, i) => ({
    ein: r.ein,
    name: r.name,
    mission: r.mission ?? null,
    description: r.description ?? null,
    cause: r.cause ?? null,
    city: r.city ?? null,
    state: r.state ?? null,
    revenue: typeof r.revenue === "number" ? Math.round(r.revenue) : null,
    website: r.website ?? null,
    logo_url: r.logo_url ?? null,
    embedding_text: r.embeddingText,
    content_hash: r.hash,
    embedding: toVectorLiteral(vectors[i]),
  }));

  // Multi-row upsert; embedding is cast to vector in SQL.
  await sql`
    insert into charities ${sql(values, "ein", "name", "mission", "description", "cause", "city", "state", "revenue", "website", "logo_url", "embedding_text", "content_hash", "embedding")}
    on conflict (ein) do update set
      name = excluded.name,
      mission = excluded.mission,
      description = excluded.description,
      cause = excluded.cause,
      city = excluded.city,
      state = excluded.state,
      revenue = excluded.revenue,
      website = excluded.website,
      logo_url = excluded.logo_url,
      embedding_text = excluded.embedding_text,
      content_hash = excluded.content_hash,
      embedding = excluded.embedding
  `;
}

async function main() {
  const start = Date.now();
  mkdirSync("output", { recursive: true });
  console.log(`[ingest] reading ${DATASET}`);
  const { prepared, skippedBothNull, parseErrors } = await loadRecords();
  console.log(
    `[ingest] prepared=${prepared.length} skippedBothNull=${skippedBothNull} parseErrors=${parseErrors}`,
  );

  const sql = makeSql(CONCURRENCY + 1);

  // Skip rows whose content_hash already matches (idempotent re-runs).
  const existing = new Map<string, string>();
  for (const r of await sql<{ ein: string; content_hash: string | null }[]>`
    select ein, content_hash from charities
  `) {
    if (r.content_hash) existing.set(r.ein, r.content_hash);
  }
  const todo = prepared.filter((r) => existing.get(r.ein) !== r.hash);
  console.log(`[ingest] ${todo.length} to (re)embed, ${prepared.length - todo.length} unchanged`);

  // Build batches.
  const batches: Prepared[][] = [];
  for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH));

  const failed: { ein: string; error: string }[] = [];
  let embedded = 0;
  let done = 0;

  // Bounded-concurrency worker pool over the batch queue.
  let cursor = 0;
  async function worker(id: number) {
    while (cursor < batches.length) {
      const myIndex = cursor++;
      const batch = batches[myIndex];
      try {
        const vectors = await embed(
          batch.map((r) => r.embeddingText),
          "document",
        );
        if (vectors.some((v) => !v || v.length !== EMBED_DIM)) {
          throw new Error(`bad embedding dims in batch ${myIndex}`);
        }
        await upsertBatch(sql, batch, vectors);
        embedded += batch.length;
      } catch (err) {
        for (const r of batch) failed.push({ ein: r.ein, error: String(err).slice(0, 200) });
        console.error(`[ingest] batch ${myIndex} failed (worker ${id}):`, String(err).slice(0, 160));
      }
      done++;
      if (done % 10 === 0 || done === batches.length) {
        console.log(`[ingest] batch ${done}/${batches.length} (embedded=${embedded})`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));

  // Verify.
  const [{ rows }] = await sql<{ rows: number }[]>`select count(*)::int as rows from charities`;
  const [{ withEmb }] = await sql<{ withEmb: number }[]>`
    select count(*)::int as "withEmb" from charities where embedding is not null
  `;
  await sql.end();

  const corpusPct = prepared.length ? (withEmb / prepared.length) * 100 : 0;
  const report = {
    dataset: DATASET,
    durationSec: Math.round((Date.now() - start) / 10) / 100,
    totalLines: prepared.length + skippedBothNull + parseErrors,
    prepared: prepared.length,
    skippedBothNull,
    parseErrors,
    embeddedThisRun: embedded,
    failed: failed.length,
    rowsInTable: rows,
    rowsWithEmbedding: withEmb,
    corpusEmbeddedPct: Math.round(corpusPct * 100) / 100,
    pass: withEmb >= Math.floor(prepared.length * 0.95),
  };
  writeFileSync("output/ingest_report.json", `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(
    "output/failed_records.jsonl",
    failed.map((f) => JSON.stringify(f)).join("\n") + (failed.length ? "\n" : ""),
  );

  console.log("[ingest] report:", JSON.stringify(report, null, 2));
  if (!report.pass) {
    console.error(`[ingest] FAILED: only ${withEmb}/${prepared.length} embedded (<95%)`);
    process.exit(1);
  }
  console.log("[ingest] done ✓");
}

main().catch((err) => {
  console.error("[ingest] fatal:", err);
  process.exit(1);
});
