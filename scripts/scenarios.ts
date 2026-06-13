/**
 * Backend RUBRIC check — runs the interview + recommend pipeline for S1/S2/S3
 * and asserts the data-level requirements (facets, exclusions, allocation,
 * counts). The browser-level + copy/feel checks happen later against the live URL.
 *
 * Run: pnpm tsx --env-file-if-exists=.env.local scripts/scenarios.ts
 */
import { getSql } from "../app/db/client";
import { emptyFacets, type Facets } from "../app/lib/facets";
import { type InterviewMode, OPENING_QUESTION, runInterviewTurn } from "../app/llm/interview";
import { generateReport } from "../app/pipeline/recommend";

let failures = 0;
function check(label: string, cond: boolean, detail = "") {
  console.log(`  ${cond ? "✓" : "✗ FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
}

async function simulate(mode: InterviewMode, userTurns: string[]) {
  let facets = emptyFacets();
  const history: { role: "agent" | "user"; text: string }[] = [
    { role: "agent", text: OPENING_QUESTION },
  ];
  let turns = 0;
  for (const ans of userTurns) {
    history.push({ role: "user", text: ans });
    const r = await runInterviewTurn({ mode, history, facets });
    facets = r.facets;
    turns++;
    if (r.nextQuestion) history.push({ role: "agent", text: r.nextQuestion });
    if (r.done) break;
  }
  return { facets, agentTurns: history.filter((h) => h.role === "agent").length, turns };
}

function sum(xs: number[]) {
  return Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;
}

async function s1() {
  console.log("\n=== S1 · Maria (quick) ===");
  const { facets } = await simulate("quick", [
    "I grew up in Oakland relying on the local food bank, and now that I'm earning well I want to give back to families like mine — food, housing, and helping kids get a fair start.",
    "Mostly hunger and education. Please nothing political.",
    "Around $100 a month, and I'd rather support a handful of places I really believe in than spread it thin.",
  ]);
  console.log("  facets:", JSON.stringify(facets));
  check(
    "causes ⊇ {hunger,education}",
    facets.causes.some((c) => /food|hunger|nutrition/.test(c)) &&
      facets.causes.some((c) => /educat|youth/.test(c)),
  );
  check("geo = Oakland/CA", facets.geo.state === "CA");
  check("exclusions ⊇ political_advocacy", facets.exclusions.tags.includes("political_advocacy"));
  check(
    "budget = $100/monthly",
    facets.budget.amount === 100 && facets.budget.cadence === "monthly",
  );
  check("strategy = concentrate", facets.strategy === "concentrate");
  check("unasked facets null (risk/horizon)", facets.risk === null && facets.horizon === null);

  const report = await generateReport(facets, "quick");
  check("10 charities", report.charities.length === 10, `${report.charities.length}`);
  const relevant = report.charities.filter((c) =>
    /food|nutrition|educat|youth|homeless|housing|human-services/.test(c.cause ?? ""),
  ).length;
  check("≥7 hunger/edu/housing/youth", relevant >= 7, `${relevant}/10`);
  const caOrgs = report.charities.filter((c) => c.state === "CA").length;
  check("≥2 CA orgs", caOrgs >= 2, `${caOrgs}`);
  check(
    "zero political-advocacy orgs",
    !report.charities.some((c) => c.cause === "social-advocacy"),
  );
  const funded = report.portfolio.items;
  check(
    "portfolio top 3 = $50/$30/$20",
    funded.length === 3 &&
      funded[0].amount === 50 &&
      funded[1].amount === 30 &&
      funded[2].amount === 20,
    JSON.stringify(funded.map((f) => f.amount)),
  );
  check("portfolio sums to $100", sum(funded.map((f) => f.amount)) === 100);
  console.log("  philosophy:", report.philosophy);
  console.log("  why[0]:", report.charities[0]?.whyLine);
  console.log(
    "  fund:",
    report.fundPortfolio?.isFork ? "fork" : report.fundPortfolio?.primary.displayName,
  );
}

async function s2() {
  console.log("\n=== S2 · The Chens (full) ===");
  const { facets, agentTurns } = await simulate("full", [
    "We're worried about climate change and our kids' future — the environment and scientific research that can actually move the needle.",
    "We want to give globally, wherever it has the most impact. And please nothing religious.",
    "Also nothing affiliated with Stanford — my husband works there, so it'd be a conflict.",
    "We're open to newer, unproven approaches if they're promising, but we'd like to see some evidence they're working. We care about systemic change, not band-aids.",
    "$500 a month, and yes keep a discretionary reserve for opportunities. We're thinking multi-year, and we'd like to broaden first then focus.",
  ]);
  console.log("  facets:", JSON.stringify(facets));
  check(
    "causes include environment",
    facets.causes.some((c) => /environment|climate/.test(c)),
  );
  check(
    "causes include research",
    facets.causes.some((c) => /science|research/.test(c)),
  );
  check("scope global", facets.geo.scope === "global");
  check("exclusions ⊇ religious", facets.exclusions.tags.includes("religious"));
  check(
    "free-text Stanford captured",
    facets.exclusions.freeText.some((f) => /stanford/i.test(f)),
  );
  check("risk experimental", facets.risk === "experimental");
  check("change systemic", facets.change === "systemic");
  check("outcomes wants_evidence", facets.outcomes === "wants_evidence");
  check("budget $500/monthly", facets.budget.amount === 500 && facets.budget.cadence === "monthly");
  check("discretionaryReserve true", facets.discretionaryReserve === true);
  check("horizon multi_year", facets.horizon === "multi_year");
  check("strategy broaden_then_focus", facets.strategy === "broaden_then_focus");
  check("≤12 agent turns", agentTurns <= 12, `${agentTurns}`);

  const report = await generateReport(facets, "full");
  check("HARD: zero religious orgs", !report.charities.some((c) => c.cause === "religion"));
  const blob = JSON.stringify(report).toLowerCase();
  check("STRETCH: 'stanford' absent everywhere", !blob.includes("stanford"));
  check(
    "portfolio sums to $500",
    sum(report.portfolio.items.map((i) => i.amount)) + (report.portfolio.reserveAmount ?? 0) ===
      500,
    `items+reserve`,
  );
  check(
    "fund = ESG (sustainability signal)",
    report.fundPortfolio?.primary.id?.startsWith("esg") ?? false,
    report.fundPortfolio?.primary.displayName ?? "none",
  );
  console.log(
    "  riskImpact:",
    report.strategySections.find((s) => s.title === "Risk & Impact")?.body,
  );
}

async function s3() {
  console.log("\n=== S3 · Sam (terse) ===");
  const { facets, agentTurns } = await simulate("quick", [
    "animals i guess",
    "skip",
    "don't know, just show me",
  ]);
  console.log("  facets:", JSON.stringify(facets));
  check(
    "causes = [animals]",
    facets.causes.length === 1 && /animal/.test(facets.causes[0] ?? ""),
    JSON.stringify(facets.causes),
  );
  check("budget null", facets.budget.amount === null);
  check("strategy null", facets.strategy === null);
  check("geo null", facets.geo.state === null && facets.geo.scope === null);
  check("exited under cap", agentTurns <= 4, `${agentTurns} agent turns`);

  const report = await generateReport(facets, "quick");
  check(
    "all sections render",
    !!report.philosophy && report.strategySections.length === 3 && report.charities.length === 10,
  );
  const animalish = report.charities.filter(
    (c) =>
      /animal/.test(c.cause ?? "") ||
      /wildlife|zoo|animal|wild|species|habitat/i.test(`${c.name} ${c.mission ?? ""}`),
  ).length;
  check("all 10 animal/wildlife-related", animalish === 10, `${animalish}/10`);
  check("portfolio uses % shares (no budget)", !report.portfolio.hasConcreteBudget);
  check(
    "'shares of whatever you give' copy present",
    /shares of whatever you give/i.test(report.portfolio.intro),
  );
  console.log("  philosophy:", report.philosophy);
  console.log(
    "  budgetHorizon:",
    report.strategySections.find((s) => s.title === "Budget & Time Horizon")?.body,
  );
}

async function main() {
  const which = process.argv[2];
  if (!which || which === "1") await s1();
  if (!which || which === "2") await s2();
  if (!which || which === "3") await s3();
  await getSql().end();
  console.log(
    `\n${failures === 0 ? "✅ ALL BACKEND CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
