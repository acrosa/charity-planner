/**
 * RUBRIC §3 — runs the three integration scenarios against the LIVE deployed URL
 * over HTTP (interview + recommend), checking every mechanical assertion. The
 * copy/feel [eye] checks are judged separately from the printed report content.
 *
 * Run: BASE_URL=https://charity-planner.fly.dev pnpm tsx scripts/verify-live.ts [1|2|3]
 */
import { OPENING_QUESTION } from "../app/llm/interview";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let failures = 0;

function check(label: string, cond: boolean, detail = "") {
  console.log(`  ${cond ? "✓" : "✗ FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

type Msg = { role: "agent" | "user"; text: string };

async function interview(mode: "quick" | "full", answers: string[]) {
  // biome-ignore lint/suspicious/noExplicitAny: live JSON
  let facets: any;
  const opener = await post("/api/interview", { mode, history: [], facets: undefined });
  const history: Msg[] = [{ role: "agent", text: opener.nextQuestion ?? OPENING_QUESTION }];
  // biome-ignore lint/suspicious/noExplicitAny: live JSON
  let r: any = { done: false };
  for (const ans of answers) {
    history.push({ role: "user", text: ans });
    r = await post("/api/interview", { mode, history, facets });
    facets = r.facets;
    if (r.nextQuestion) history.push({ role: "agent", text: r.nextQuestion });
    if (r.done) break;
  }
  let guard = 0;
  while (!r.done && guard++ < 8) {
    history.push({ role: "user", text: "That's everything — please build my plan." });
    r = await post("/api/interview", { mode, history, facets });
    facets = r.facets;
    if (r.nextQuestion) history.push({ role: "agent", text: r.nextQuestion });
  }
  return { facets, agentTurns: history.filter((m) => m.role === "agent").length };
}

const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;

async function s1() {
  console.log("\n=== S1 · Maria (quick) — live ===");
  const { facets } = await interview("quick", [
    "I grew up in Oakland relying on the local food bank, and now that I'm earning well I want to give back to families like mine — food, housing, and helping kids get a fair start.",
    "Mostly hunger and education. Please nothing political.",
    "Around $100 a month, and I'd rather support a handful of places I really believe in than spread it thin.",
  ]);
  check(
    "causes ⊇ {hunger,education}",
    facets.causes.some((c: string) => /food|hunger|nutrition/.test(c)) &&
      facets.causes.some((c: string) => /educat|youth/.test(c)),
    JSON.stringify(facets.causes),
  );
  check("geo = CA", facets.geo.state === "CA");
  check("exclusions ⊇ political_advocacy", facets.exclusions.tags.includes("political_advocacy"));
  check(
    "budget = $100/monthly",
    facets.budget.amount === 100 && facets.budget.cadence === "monthly",
  );
  check("strategy = concentrate", facets.strategy === "concentrate");
  check("unasked facets null", facets.risk === null && facets.horizon === null);

  const { report } = await post("/api/recommend", { facets, mode: "quick" });
  check("10 charities", report.charities.length === 10);
  const rel = report.charities.filter((c: { cause: string }) =>
    /food|nutrition|educat|youth|homeless|housing|human-services/.test(c.cause ?? ""),
  ).length;
  check("≥7 hunger/edu/housing/youth", rel >= 7, `${rel}/10`);
  check(
    "≥2 CA orgs",
    report.charities.filter((c: { state: string }) => c.state === "CA").length >= 2,
  );
  check(
    "zero political-advocacy",
    !report.charities.some((c: { cause: string }) => c.cause === "social-advocacy"),
  );
  const items = report.portfolio.items;
  check(
    "portfolio $50/$30/$20",
    items.length === 3 &&
      items[0].amount === 50 &&
      items[1].amount === 30 &&
      items[2].amount === 20,
    JSON.stringify(items.map((i: { amount: number }) => i.amount)),
  );
  check("portfolio sums $100", sum(items.map((i: { amount: number }) => i.amount)) === 100);
  console.log("  philosophy:", report.philosophy);
  console.log("  why[0]:", report.charities[0].whyLine);
}

async function s2() {
  console.log("\n=== S2 · The Chens (full) — live ===");
  const { facets, agentTurns } = await interview("full", [
    "We're worried about climate change and our kids' future — the environment and scientific research that can actually move the needle.",
    "We want to give globally, wherever it has the most impact. And please nothing religious.",
    "Also nothing affiliated with Stanford — my husband works there, so it'd be a conflict.",
    "We're open to newer, unproven approaches if they're promising, but we'd like to see some evidence they're working. We care about systemic change, not band-aids.",
    "$500 a month, and yes keep a discretionary reserve. We're thinking multi-year, and we'd like to broaden first then focus.",
  ]);
  check(
    "environment cause",
    facets.causes.some((c: string) => /environment|climate/.test(c)),
  );
  check(
    "research cause",
    facets.causes.some((c: string) => /science|research/.test(c)),
  );
  check("scope global", facets.geo.scope === "global");
  check("exclusions ⊇ religious", facets.exclusions.tags.includes("religious"));
  check(
    "free-text Stanford",
    facets.exclusions.freeText.some((f: string) => /stanford/i.test(f)),
  );
  check("risk experimental", facets.risk === "experimental");
  check("budget $500/monthly", facets.budget.amount === 500 && facets.budget.cadence === "monthly");
  check("reserve true", facets.discretionaryReserve === true);
  check("horizon multi_year", facets.horizon === "multi_year");
  check("strategy broaden_then_focus", facets.strategy === "broaden_then_focus");
  check("≤12 agent turns", agentTurns <= 12, `${agentTurns}`);

  const { report } = await post("/api/recommend", { facets, mode: "full" });
  check(
    "HARD: zero religious orgs",
    !report.charities.some((c: { cause: string }) => c.cause === "religion"),
  );
  check("STRETCH: 'stanford' absent", !JSON.stringify(report).toLowerCase().includes("stanford"));
  check(
    "portfolio sums $500",
    sum(report.portfolio.items.map((i: { amount: number }) => i.amount)) +
      (report.portfolio.reserveAmount ?? 0) ===
      500,
  );
  check(
    "fund = ESG",
    (report.fundPortfolio?.primary.id ?? "").startsWith("esg"),
    report.fundPortfolio?.primary.displayName,
  );
  console.log(
    "  riskImpact:",
    report.strategySections.find((s: { title: string }) => s.title === "Risk & Impact")?.body,
  );
}

async function s3() {
  console.log("\n=== S3 · Sam (terse) — live ===");
  const { facets, agentTurns } = await interview("quick", [
    "animals i guess",
    "skip",
    "don't know, just show me",
  ]);
  check(
    "causes = [animals]",
    facets.causes.length === 1 && /animal/.test(facets.causes[0] ?? ""),
    JSON.stringify(facets.causes),
  );
  check("budget null", facets.budget.amount === null);
  check("strategy null", facets.strategy === null);
  check("geo null", facets.geo.state === null && facets.geo.scope === null);
  check("exited under cap", agentTurns <= 4, `${agentTurns}`);

  const { report } = await post("/api/recommend", { facets, mode: "quick" });
  check(
    "all sections render",
    !!report.philosophy && report.strategySections.length === 3 && report.charities.length === 10,
  );
  const animalish = report.charities.filter(
    (c: { cause: string; name: string; mission: string }) =>
      /animal/.test(c.cause ?? "") ||
      /wildlife|zoo|animal|wild|species|habitat|conservation/i.test(`${c.name} ${c.mission ?? ""}`),
  ).length;
  check("all 10 animal/wildlife", animalish === 10, `${animalish}/10`);
  check("% shares (no budget)", report.portfolio.hasConcreteBudget === false);
  check(
    "'shares of whatever you give' copy",
    /shares of whatever you give/i.test(report.portfolio.intro),
  );
  console.log("  philosophy:", report.philosophy);
  console.log(
    "  budgetHorizon:",
    report.strategySections.find((s: { title: string }) => s.title === "Budget & Time Horizon")
      ?.body,
  );
}

async function main() {
  console.log(`Target: ${BASE}`);
  const which = process.argv[2];
  if (!which || which === "1") await s1();
  if (!which || which === "2") await s2();
  if (!which || which === "3") await s3();
  console.log(
    `\n${failures === 0 ? "✅ ALL LIVE CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
