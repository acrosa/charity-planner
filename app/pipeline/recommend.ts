import { type CauseBucket, causeBucket } from "../lib/causeColor";
import type { Facets } from "../lib/facets";
import type { CauseComposition, CharityRec, PlanItem, Portfolio, Report } from "../lib/types";
import { expand } from "../llm/expand";
import { type PersonalizeCharity, personalize } from "../llm/personalize";
import { buildExclusionPlan } from "./exclusions";
import { selectFundPortfolio } from "./portfolio";
import { recall, rerankCandidates, selectFinal } from "./retrieval";
import { planAllocation } from "./strategy";

const TOTAL_CORPUS = 10_000;

const BUCKET_LABEL: Record<CauseBucket, string> = {
  health: "Health",
  "human-rights": "Human services",
  education: "Education",
  justice: "Justice",
  research: "Research",
  environment: "Environment",
  arts: "Arts & culture",
  animals: "Animals & wildlife",
  food: "Food & hunger",
  faith: "Faith",
  fallback: "Other",
};

function daffyUrl(ein: string): string {
  return `https://www.daffy.org/charities/${ein}`;
}

/** Deterministic intent line for the reranker — reproducible across runs. */
function intentLine(f: Facets): string {
  const parts: string[] = [];
  parts.push(f.causes.length ? `Causes: ${f.causes.join(", ")}.` : "General charitable giving.");
  const where = f.geo.city || f.geo.state || (f.geo.scope === "global" ? "anywhere" : f.geo.scope);
  if (where) parts.push(`Focused on ${where}.`);
  if (f.strategy) parts.push(`Strategy: ${f.strategy.replace(/_/g, " ")}.`);
  const avoid = [...f.exclusions.tags.map((t) => t.replace(/_/g, " ")), ...f.exclusions.freeText];
  if (avoid.length) parts.push(`Avoid: ${avoid.join("; ")}.`);
  return parts.join(" ");
}

function cadenceLabel(c: Facets["budget"]["cadence"]): string {
  return c === "monthly"
    ? "Monthly"
    : c === "annual"
      ? "Annual"
      : c === "one_time"
        ? "One-time"
        : "Up to you";
}

function portfolioIntro(hasBudget: boolean, total: number, cadence: string): string {
  if (hasBudget) {
    return `Here's how your $${total}${cadence === "Monthly" ? "/month" : ""} divides across your portfolio.`;
  }
  // RUBRIC S3 copy must be present when budget is unknown.
  return "You didn't name an amount, so these are shares of whatever you give — the proportions hold at any budget.";
}

export interface RecommendResult {
  report: Report;
}

export async function generateReport(facets: Facets, mode: "quick" | "full"): Promise<Report> {
  // 1. Expand → retrieval queries + free-text exclusion predicates.
  const { retrievalQueries, exclusionPredicates } = await expand(facets);
  const plan = buildExclusionPlan(facets, exclusionPredicates);

  // 2. Recall → rerank → diversify/select 10.
  const candidates = await recall(retrievalQueries, plan);
  const ranked = await rerankCandidates(intentLine(facets), candidates);
  const selected = selectFinal(ranked, { facets, plan });

  // 3. Allocate dollars/shares across the selected set.
  const alloc = planAllocation(
    facets,
    selected.map((c, i) => ({ ein: c.ein, rank: i + 1, causeBucket: causeBucket(c.cause) })),
  );
  const allocByEin = new Map(alloc.slices.map((s) => [s.ein, s]));

  // 4. Personalize prose (philosophy, sections, why-lines) — grounded in facets.
  const personalizeCharities: PersonalizeCharity[] = selected.map((c) => {
    const s = allocByEin.get(c.ein);
    return {
      ein: c.ein,
      name: c.name,
      mission: c.mission,
      cause: c.cause,
      city: c.city,
      state: c.state,
      role: s?.role ?? "explorer",
      funded: s?.funded ?? false,
    };
  });
  const prose = await personalize({
    facets,
    charities: personalizeCharities,
    hasConcreteBudget: alloc.hasConcreteBudget,
    hasReserve: !!alloc.reserve,
  });
  const whyByEin = new Map(prose.whyLines.map((w) => [w.ein, w.why]));

  // 5. Assemble charity records.
  const charities: CharityRec[] = selected.map((c, i) => {
    const s = allocByEin.get(c.ein);
    const bucket = causeBucket(c.cause);
    return {
      ein: c.ein,
      name: c.name,
      mission: c.mission,
      cause: c.cause,
      causeBucket: bucket,
      city: c.city,
      state: c.state,
      website: c.website,
      logoUrl: c.logoUrl,
      rank: i + 1,
      role: s?.role ?? "explorer",
      weight: s?.pct ?? 0,
      pct: s?.pct ?? 0,
      amount: s?.amount ?? 0,
      whyLine: whyByEin.get(c.ein) ?? `${c.name} fits the causes you described.`,
      daffyUrl: daffyUrl(c.ein),
      news: null,
    };
  });

  // 6. Portfolio: funded slices + reserve + composition by cause.
  const fundedCharities = charities.filter((c) => allocByEin.get(c.ein)?.funded ?? false);
  const compMap = new Map<CauseBucket, number>();
  for (const c of fundedCharities)
    compMap.set(c.causeBucket, (compMap.get(c.causeBucket) ?? 0) + c.pct);
  const compositionByCause: CauseComposition[] = [...compMap.entries()]
    .map(([bucket, pct]) => ({
      bucket,
      label: BUCKET_LABEL[bucket],
      pct: Math.round(pct * 10) / 10,
    }))
    .sort((a, b) => b.pct - a.pct);

  const cadence = cadenceLabel(facets.budget.cadence);
  const portfolio: Portfolio = {
    cadence: facets.budget.cadence,
    total: alloc.total,
    hasConcreteBudget: alloc.hasConcreteBudget,
    reservePct: alloc.reserve?.pct ?? null,
    reserveAmount: alloc.reserve?.amount ?? null,
    intro: portfolioIntro(alloc.hasConcreteBudget, alloc.total, cadence),
    items: fundedCharities.map((c) => ({
      ein: c.ein,
      name: c.name,
      pct: c.pct,
      amount: c.amount,
      causeBucket: c.causeBucket,
    })),
    compositionByCause,
  };

  // 7. Plan schedule (receipt paper). Amounts right-aligned; reserve as a line.
  const planItems: PlanItem[] = [];
  for (const c of fundedCharities) {
    planItems.push({
      label: c.name,
      amount: alloc.hasConcreteBudget ? c.amount : null,
      note: alloc.hasConcreteBudget ? undefined : `${c.pct}%`,
    });
  }
  if (alloc.reserve) {
    planItems.push({
      label: "Discretionary reserve",
      amount: alloc.hasConcreteBudget ? alloc.reserve.amount : null,
      note: alloc.hasConcreteBudget ? "held for spontaneous giving" : `${alloc.reserve.pct}%`,
    });
  }

  // 8. Daffy fund portfolio (deterministic).
  const fundPortfolio = selectFundPortfolio(facets);

  const strategySections = [
    { title: "Your approach", body: prose.approachBody },
    { title: "Risk & Impact", body: prose.riskImpactBody },
    { title: "Budget & Time Horizon", body: prose.budgetHorizonBody },
  ];

  return {
    facets,
    mode,
    philosophy: prose.philosophy,
    highlightTerms: prose.highlightTerms,
    summaryTrio: prose.summary,
    strategySections,
    portfolio,
    charities,
    plan: { intro: prose.planIntro, items: planItems },
    fundPortfolio,
    meta: {
      totalCorpus: TOTAL_CORPUS,
      generatedAtISO: new Date().toISOString(),
      candidateCount: candidates.length,
    },
  };
}
