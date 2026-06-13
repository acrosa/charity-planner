/**
 * Ingest pipeline (BRIEF.md §Data-is-queryable) — STUB.
 *
 * The full implementation (a /goal step) will:
 *   1. Stream + Zod-parse `dataset/charities_10k.jsonl`, skipping both-null rows.
 *   2. Build `embedding_text` (name + mission + description) and a `content_hash`
 *      for idempotency.
 *   3. Batch-embed via Voyage `voyage-4` (input_type=document) with pacing for
 *      rate limits; per-batch durable upsert into the `charities` table.
 *   4. Write `output/ingest_report.json` + `output/failed_records.jsonl`.
 *   5. Verify: rows + non-null embeddings + corpus >= 95%.
 */
async function main() {
  console.log("[ingest] stub — not yet implemented. See scripts/ingest.ts header.");
  console.log("[ingest] required env: DATABASE_URL, VOYAGE_API_KEY");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
