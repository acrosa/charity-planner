/**
 * Retrieval sanity check (BRIEF.md §Retrieval-baseline, RUBRIC.md §2) — STUB.
 *
 * Runs the ~10-15 hand-picked queries in `eval/queries.csv` against the live
 * pipeline and PRINTS the top results to eyeball — not a metrics harness. The
 * exclusion rows must return zero forbidden orgs in the top 10.
 */
import { readFileSync } from "node:fs";

interface Query {
  query: string;
  expect: string;
}

function loadQueries(path: string): Query[] {
  const text = readFileSync(path, "utf8").trim();
  const [, ...rows] = text.split("\n");
  return rows.filter(Boolean).map((line) => {
    const [query, ...rest] = line.split(",");
    return { query: query.trim(), expect: rest.join(",").trim() };
  });
}

async function main() {
  const queries = loadQueries("eval/queries.csv");
  console.log(`[sanity] loaded ${queries.length} queries from eval/queries.csv`);
  for (const q of queries) {
    console.log(`  • "${q.query}"  →  expect: ${q.expect}`);
  }
  console.log("\n[sanity] stub — wire to the live pipeline once retrieval lands.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
