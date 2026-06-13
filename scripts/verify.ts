/**
 * Single-command verification gate (BRIEF.md §Setup, RUBRIC.md §1).
 *
 * Prints a status table across code / unit / lint / flow checks. Exits non-zero
 * ONLY on deterministic, always-achievable checks so it can run anywhere:
 *   1. typecheck + biome + vitest          (always)
 *   2. ingest check                        (when DATABASE_URL is set)
 *   3. no-leak exclusion queries           (when DATABASE_URL is set)
 *   4. smoke: BASE_URL / and /api/health   (when BASE_URL is set)
 *   5. Playwright happy path vs BASE_URL   (when BASE_URL is set)
 *
 * Checks whose prerequisites are absent are reported SKIP, never FAIL. As
 * features land, promote SKIPs to hard checks here.
 */
import { execSync } from "node:child_process";

type Status = "PASS" | "FAIL" | "SKIP";
interface Result {
  name: string;
  status: Status;
  detail?: string;
  required: boolean;
}

const results: Result[] = [];

function run(name: string, cmd: string, required = true): Result {
  try {
    execSync(cmd, { stdio: "inherit", env: process.env });
    const r: Result = { name, status: "PASS", required };
    results.push(r);
    return r;
  } catch (err) {
    const r: Result = {
      name,
      status: "FAIL",
      required,
      detail: err instanceof Error ? err.message : String(err),
    };
    results.push(r);
    return r;
  }
}

function skip(name: string, detail: string): Result {
  const r: Result = { name, status: "SKIP", detail, required: false };
  results.push(r);
  return r;
}

async function smoke(baseUrl: string) {
  for (const path of ["/", "/api/health"]) {
    try {
      const res = await fetch(new URL(path, baseUrl));
      results.push({
        name: `smoke ${path}`,
        status: res.ok ? "PASS" : "FAIL",
        required: true,
        detail: `HTTP ${res.status}`,
      });
    } catch (err) {
      results.push({
        name: `smoke ${path}`,
        status: "FAIL",
        required: true,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

// Ingest check: corpus loaded with non-null embeddings (~9.5k+).
async function ingestCheck() {
  try {
    const { getSql, withDbRetry } = await import("../app/db/client");
    const [{ rows }] = await withDbRetry(
      () =>
        getSql()<{ rows: number }[]>`
          select count(*)::int as rows from charities where embedding is not null
        `,
    );
    results.push({
      name: "ingest",
      status: rows >= 9500 ? "PASS" : "FAIL",
      required: true,
      detail: `${rows} embedded rows`,
    });
  } catch (err) {
    results.push({
      name: "ingest",
      status: "FAIL",
      required: true,
      detail: String(err).slice(0, 60),
    });
  }
}

// No-leak: exclusion queries must return zero forbidden orgs in the top 10.
async function noLeakCheck() {
  try {
    const { emptyFacets } = await import("../app/lib/facets");
    const { buildExclusionPlan, isForbidden } = await import("../app/pipeline/exclusions");
    const { recall, rerankCandidates, selectFinal } = await import("../app/pipeline/retrieval");
    const { getSql } = await import("../app/db/client");

    const cases: {
      tags: ("political_advocacy" | "religious")[];
      queries: string[];
      intent: string;
    }[] = [
      {
        tags: ["political_advocacy"],
        queries: ["feed hungry families", "education for kids"],
        intent: "hunger and education, no political advocacy",
      },
      {
        tags: ["religious"],
        queries: ["climate and environment", "scientific research"],
        intent: "climate and research, no religious orgs",
      },
    ];
    let leaks = 0;
    for (const c of cases) {
      const f = emptyFacets();
      f.exclusions.tags = c.tags;
      const plan = buildExclusionPlan(f);
      const cands = await recall(c.queries, plan);
      const ranked = await rerankCandidates(c.intent, cands);
      const top = selectFinal(ranked, { facets: f, plan, n: 10 });
      leaks += top.filter((o) =>
        isForbidden({ name: o.name, cause: o.cause, embeddingText: o.embeddingText }, plan),
      ).length;
    }
    await getSql().end();
    results.push({
      name: "no-leak",
      status: leaks === 0 ? "PASS" : "FAIL",
      required: true,
      detail: leaks === 0 ? "0 forbidden in top 10" : `${leaks} leaked`,
    });
  } catch (err) {
    results.push({
      name: "no-leak",
      status: "FAIL",
      required: true,
      detail: String(err).slice(0, 60),
    });
  }
}

async function main() {
  // 1. Always-achievable code checks.
  run("typecheck", "pnpm typecheck");
  run("biome", "pnpm lint");
  run("vitest", "pnpm test");

  // 2-3. Data checks — need a database.
  if (process.env.DATABASE_URL) {
    await ingestCheck();
    await noLeakCheck();
  } else {
    skip("ingest", "DATABASE_URL not set");
    skip("no-leak", "DATABASE_URL not set");
  }

  // 4-5. Live checks — need a deployed/served URL.
  const baseUrl = process.env.BASE_URL;
  if (baseUrl) {
    await smoke(baseUrl);
    // Happy-path only — the capture spec is for screenshots, not a gate.
    run("playwright", "pnpm exec playwright test e2e/smoke.spec.ts e2e/plan.spec.ts", true);
  } else {
    skip("smoke", "BASE_URL not set");
    skip("playwright", "BASE_URL not set");
  }

  // Status table.
  const pad = (s: string, n: number) => s.padEnd(n);
  console.log(`\n${pad("CHECK", 16)} STATUS  DETAIL`);
  console.log("-".repeat(60));
  for (const r of results) {
    const detail = r.detail ? r.detail.split("\n")[0].slice(0, 40) : "";
    console.log(`${pad(r.name, 16)} ${pad(r.status, 7)} ${detail}`);
  }

  const failed = results.filter((r) => r.status === "FAIL" && r.required);
  console.log("-".repeat(60));
  if (failed.length > 0) {
    console.log(`\n❌ ${failed.length} required check(s) failed.`);
    process.exit(1);
  }
  console.log("\n✅ All required checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
