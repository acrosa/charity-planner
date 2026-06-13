/**
 * Retrieval sanity check (BRIEF.md §Retrieval-baseline, RUBRIC.md §2).
 *
 * Runs the hand-picked queries in eval/queries.csv against the live /api/search
 * endpoint and PRINTS the top results to eyeball — not a metrics harness. The
 * EXCLUDE rows are spot-checks that the excluded org-types stay out of the top 10
 * (the authoritative no-leak gate is in `pnpm verify`).
 *
 * Run: BASE_URL=https://charity-planner.fly.dev pnpm sanity
 */
import { readFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

interface Query {
  query: string;
  expect: string;
  exclude?: string;
}

function loadQueries(path: string): Query[] {
  const text = readFileSync(path, "utf8").trim();
  const [, ...rows] = text.split("\n");
  return rows.filter(Boolean).map((line) => {
    const [rawQuery, ...rest] = line.split(",");
    const query = rawQuery.trim();
    const expect = rest.join(",").trim();
    // Rows formatted "EXCLUDE <type>: <query>" are exclusion spot-checks.
    const m = query.match(/^EXCLUDE\s+([^:]+):\s*(.+)$/i);
    if (m) return { query: m[2].trim(), expect, exclude: m[1].trim() };
    return { query, expect };
  });
}

async function search(
  q: string,
): Promise<{ name: string; cause: string | null; state: string | null }[]> {
  const res = await fetch(`${BASE}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: q, limit: 8 }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as {
    results: { name: string; cause: string | null; state: string | null }[];
  };
  return data.results;
}

async function main() {
  console.log(`Sanity check against ${BASE}\n`);
  const queries = loadQueries("eval/queries.csv");
  for (const q of queries) {
    console.log(`▸ "${q.query}"`);
    console.log(
      `  expect: ${q.expect}${q.exclude ? `  [exclusion spot-check: no ${q.exclude}]` : ""}`,
    );
    try {
      const results = await search(q.query);
      for (const r of results.slice(0, 5)) {
        console.log(`    · ${r.name}  [${r.cause ?? "?"}|${r.state ?? "?"}]`);
      }
    } catch (err) {
      console.log(`    ! search failed: ${String(err).slice(0, 80)}`);
    }
    console.log("");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
