// Portfolio dollar allocation.
//
// RUBRIC.md §1 names this as "the one unit test that matters": the per-charity
// amounts must total the monthly budget EXACTLY, with no rounding drift. We work
// in integer cents and distribute any leftover cent with the largest-remainder
// (Hamilton) method, so the parts always re-sum to the whole.

/** Split `totalCents` across `weights` so the integer-cent parts sum exactly to it. */
export function allocateCents(totalCents: number, weights: number[]): number[] {
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new Error(`totalCents must be a non-negative integer, got ${totalCents}`);
  }
  if (weights.length === 0) return [];
  if (weights.some((w) => w < 0)) {
    throw new Error("weights must be non-negative");
  }

  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum <= 0) {
    throw new Error("weights must sum to a positive value");
  }

  // Exact-ish ideal share per slot, then floor and hand out the remaining cents
  // to the slots with the largest fractional remainders (ties → earlier slot).
  const ideal = weights.map((w) => (totalCents * w) / weightSum);
  const floors = ideal.map(Math.floor);
  const distributed = floors.reduce((a, b) => a + b, 0);
  let leftover = totalCents - distributed;

  const order = ideal
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index);

  const result = [...floors];
  for (let i = 0; i < order.length && leftover > 0; i++) {
    result[order[i].index] += 1;
    leftover -= 1;
  }

  return result;
}

/** Same split, returned in dollars (cents / 100). Parts still sum exactly to the budget. */
export function allocateDollars(monthlyBudget: number, weights: number[]): number[] {
  const cents = allocateCents(Math.round(monthlyBudget * 100), weights);
  return cents.map((c) => c / 100);
}

export interface AllocationItem {
  /** Stable key (e.g. charity EIN) for the slot. */
  key: string;
  /** Relative weight; need not be normalised. */
  weight: number;
}

export interface AllocationResult {
  key: string;
  amount: number; // dollars
  cents: number;
}

/** Allocate a budget across keyed items, preserving input order. */
export function allocate(monthlyBudget: number, items: AllocationItem[]): AllocationResult[] {
  const cents = allocateCents(
    Math.round(monthlyBudget * 100),
    items.map((i) => i.weight),
  );
  return items.map((item, i) => ({ key: item.key, cents: cents[i], amount: cents[i] / 100 }));
}
