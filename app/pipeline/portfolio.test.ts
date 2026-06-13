import { describe, expect, it } from "vitest";
import { emptyFacets } from "../lib/facets";
import { selectFundPortfolio } from "./portfolio";

describe("selectFundPortfolio (deterministic Daffy mapping)", () => {
  it("NEVER recommends crypto unless explicitly mentioned", () => {
    const f = emptyFacets();
    f.causes = ["environment"];
    f.crypto = { mentioned: false, coin: null };
    const rec = selectFundPortfolio(f);
    expect(rec?.primary.id ?? "").not.toContain("crypto");
    expect(rec?.alternative?.id ?? "").not.toContain("crypto");
  });

  it("recommends crypto only when mentioned, by named coin", () => {
    const f = emptyFacets();
    f.crypto = { mentioned: true, coin: "bitcoin" };
    expect(selectFundPortfolio(f)?.primary.id).toBe("crypto-bitcoin");
  });

  it("Chens: ESG only on sustainability signal + known horizon (RUBRIC S2)", () => {
    const f = emptyFacets();
    f.causes = ["environment", "science-tech"];
    f.risk = "experimental";
    f.horizon = "multi_year";
    const rec = selectFundPortfolio(f);
    expect(rec?.primary.id).toBe("esg-aggressive");
    expect(rec?.disclaimer).toMatch(/not investment advice/i);
  });

  it("no ESG when there is no sustainability signal", () => {
    const f = emptyFacets();
    f.causes = ["food-nutrition", "education"];
    f.risk = "balanced";
    f.horizon = "multi_year";
    const rec = selectFundPortfolio(f);
    expect(rec?.primary.id ?? "").not.toContain("esg");
  });

  it("Maria/Sam: horizon + risk unknown → a fork, not a single pick", () => {
    const f = emptyFacets();
    f.causes = ["food-nutrition"];
    const rec = selectFundPortfolio(f);
    expect(rec?.isFork).toBe(true);
    expect(rec?.alternative).toBeTruthy();
    expect(rec?.disclaimer).toMatch(/not investment advice/i);
  });
});
