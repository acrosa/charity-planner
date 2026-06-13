import type { CauseBucket } from "../lib/causeColor";
import type { Facets } from "../lib/facets";
import { allocateCents } from "./allocation";

// Turns captured facets into an EXACT dollar (or percentage) allocation across
// the recommended charities. Amounts always re-sum to the budget to the cent
// (RUBRIC §1). When the budget is unknown we allocate percentage "shares"
// instead (RUBRIC S3 — "shares of whatever you give").

const RESERVE_PCT = 0.15; // discretionary reserve, when the donor asked for one

export interface AllocInputCharity {
  ein: string;
  rank: number; // 1-based, already ranked best-first
  causeBucket: CauseBucket;
}

export interface AllocSlice {
  ein: string;
  role: "anchor" | "explorer" | "core";
  amount: number; // dollars (0 in percentage mode)
  pct: number; // percent of total giving (incl. reserve base)
  funded: boolean;
}

export interface AllocationPlan {
  hasConcreteBudget: boolean;
  total: number; // budget in dollars (0 when unknown)
  reserve: { amount: number; pct: number } | null;
  slices: AllocSlice[]; // one per input charity, in rank order
}

interface FundSpec {
  count: number; // how many charities to fund
  weights: number[]; // relative weights for the funded charities
  roles: AllocSlice["role"][];
}

/** Decide how many charities to fund and with what relative weights. */
function fundSpec(strategy: Facets["strategy"], n: number): FundSpec {
  if (strategy === "concentrate") {
    const count = Math.min(3, n);
    return {
      count,
      weights: [0.5, 0.3, 0.2].slice(0, count),
      roles: Array(count).fill("core"),
    };
  }
  if (strategy === "broaden_then_focus") {
    const anchors = Math.min(2, n);
    const explorers = Math.min(5, Math.max(0, n - anchors));
    const count = anchors + explorers;
    const weights = [
      ...Array(anchors).fill(2.5), // anchors carry ~2.5× an explorer
      ...Array(explorers).fill(1.0),
    ];
    const roles: AllocSlice["role"][] = [
      ...Array(anchors).fill("anchor"),
      ...Array(explorers).fill("explorer"),
    ];
    return { count, weights, roles };
  }
  // broaden / unknown: fund the whole set with a gentle rank decay.
  return {
    count: n,
    weights: Array.from({ length: n }, (_, i) => 1 - 0.04 * i),
    roles: Array(n).fill("explorer"),
  };
}

export function planAllocation(facets: Facets, charities: AllocInputCharity[]): AllocationPlan {
  const n = charities.length;
  const ordered = [...charities].sort((a, b) => a.rank - b.rank);
  const spec = fundSpec(facets.strategy, n);
  const reservePct = facets.discretionaryReserve ? RESERVE_PCT : 0;

  const budget = facets.budget.amount ?? 0;
  const hasConcreteBudget = budget > 0;

  // Work in integer "units": cents for a real budget, basis points for shares.
  const totalUnits = hasConcreteBudget ? Math.round(budget * 100) : 10_000;
  const reserveUnits = reservePct > 0 ? Math.round(totalUnits * reservePct) : 0;
  const givingUnits = totalUnits - reserveUnits;

  const fundedUnits = allocateCents(givingUnits, spec.weights);

  const toMoney = (units: number) => (hasConcreteBudget ? units / 100 : 0);
  const toPct = (units: number) => Math.round((units / totalUnits) * 1000) / 10;

  const slices: AllocSlice[] = ordered.map((c, i) => {
    const funded = i < spec.count;
    const units = funded ? fundedUnits[i] : 0;
    return {
      ein: c.ein,
      role: funded ? spec.roles[i] : "explorer",
      amount: toMoney(units),
      pct: funded ? toPct(units) : 0,
      funded,
    };
  });

  return {
    hasConcreteBudget,
    total: budget,
    reserve: reserveUnits > 0 ? { amount: toMoney(reserveUnits), pct: toPct(reserveUnits) } : null,
    slices,
  };
}
