import { describe, expect, it } from "vitest";
import { allocate, allocateCents, allocateDollars } from "./allocation";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("allocateCents — the parts always re-sum to the whole", () => {
  it("splits Maria's $100 concentrate plan to exactly $50 / $30 / $20 (RUBRIC S1)", () => {
    const parts = allocateCents(10_000, [0.5, 0.3, 0.2]);
    expect(parts).toEqual([5000, 3000, 2000]);
    expect(sum(parts)).toBe(10_000);
  });

  it("splits the Chens' $500 full-mode plan and re-sums to exactly $500 (RUBRIC S2)", () => {
    // 15% reserve, 2×25% anchors, 5×10% explorers — weights, not final %.
    const weights = [0.15, 0.25, 0.25, 0.1, 0.1, 0.1, 0.1, 0.1];
    const parts = allocateCents(50_000, weights);
    expect(sum(parts)).toBe(50_000);
  });

  it("never drifts even with budgets and weights that do not divide evenly", () => {
    const budgets = [10_000, 12_345, 9_999, 33_333, 1, 7, 100_000];
    const weightSets = [
      [1, 1, 1],
      [0.5, 0.3, 0.2],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [3, 1, 1, 1],
      [0.15, 0.25, 0.25, 0.1, 0.1, 0.1, 0.1, 0.1],
    ];
    for (const total of budgets) {
      for (const weights of weightSets) {
        const parts = allocateCents(total, weights);
        expect(sum(parts)).toBe(total);
        expect(parts.every((p) => Number.isInteger(p) && p >= 0)).toBe(true);
      }
    }
  });

  it("hands leftover cents to the largest remainders first", () => {
    // 100 cents over 3 equal slots → 34/33/33 (first slot gets the extra).
    expect(allocateCents(100, [1, 1, 1])).toEqual([34, 33, 33]);
  });

  it("returns [] for empty weights and handles a single slot", () => {
    expect(allocateCents(500, [])).toEqual([]);
    expect(allocateCents(500, [9])).toEqual([500]);
  });

  it("rejects malformed input", () => {
    expect(() => allocateCents(-1, [1])).toThrow();
    expect(() => allocateCents(1.5, [1])).toThrow();
    expect(() => allocateCents(100, [0, 0])).toThrow();
    expect(() => allocateCents(100, [-1, 2])).toThrow();
  });
});

describe("allocateDollars", () => {
  it("keeps cent precision and exact totals", () => {
    const parts = allocateDollars(100, [0.5, 0.3, 0.2]);
    expect(parts).toEqual([50, 30, 20]);
    expect(sum(parts)).toBeCloseTo(100, 10);
  });
});

describe("allocate — keyed", () => {
  it("preserves order and keys, and re-sums to the budget", () => {
    const result = allocate(100, [
      { key: "a", weight: 0.5 },
      { key: "b", weight: 0.3 },
      { key: "c", weight: 0.2 },
    ]);
    expect(result.map((r) => r.key)).toEqual(["a", "b", "c"]);
    expect(result.map((r) => r.amount)).toEqual([50, 30, 20]);
    expect(sum(result.map((r) => r.cents))).toBe(10_000);
  });
});
