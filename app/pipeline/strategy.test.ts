import { describe, expect, it } from "vitest";
import { emptyFacets } from "../lib/facets";
import { planAllocation } from "./strategy";

function charities(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    ein: `e${i}`,
    rank: i + 1,
    causeBucket: "food" as const,
  }));
}

const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;

describe("planAllocation", () => {
  it("Maria concentrate $100 → top 3 at $50/$30/$20 (RUBRIC S1)", () => {
    const f = emptyFacets();
    f.strategy = "concentrate";
    f.budget = { amount: 100, cadence: "monthly" };
    const plan = planAllocation(f, charities(10));
    const funded = plan.slices.filter((s) => s.funded);
    expect(funded.map((s) => s.amount)).toEqual([50, 30, 20]);
    expect(sum(plan.slices.map((s) => s.amount))).toBe(100);
    expect(plan.reserve).toBeNull();
  });

  it("Chens broaden_then_focus $500 + reserve → sums to exactly $500 (RUBRIC S2)", () => {
    const f = emptyFacets();
    f.strategy = "broaden_then_focus";
    f.budget = { amount: 500, cadence: "monthly" };
    f.discretionaryReserve = true;
    const plan = planAllocation(f, charities(10));
    const funded = plan.slices.filter((s) => s.funded);
    expect(funded.length).toBe(7); // 2 anchors + 5 explorers
    expect(funded.filter((s) => s.role === "anchor").length).toBe(2);
    expect(funded.filter((s) => s.role === "explorer").length).toBe(5);
    expect(plan.reserve).not.toBeNull();
    expect(sum([...funded.map((s) => s.amount), plan.reserve?.amount ?? 0])).toBe(500);
  });

  it("Sam no budget → percentage shares across all 10 summing ~100% (RUBRIC S3)", () => {
    const f = emptyFacets();
    f.causes = ["animals"];
    const plan = planAllocation(f, charities(10));
    expect(plan.hasConcreteBudget).toBe(false);
    expect(plan.slices.filter((s) => s.funded).length).toBe(10);
    expect(plan.slices.every((s) => s.amount === 0)).toBe(true);
    expect(sum(plan.slices.map((s) => s.pct))).toBeCloseTo(100, 0);
  });
});
