import { describe, expect, it } from "vitest";
import { emptyFacets } from "../lib/facets";
import {
  buildExclusionPlan,
  extractPredicatesFromFreeText,
  isForbidden,
  scrub,
} from "./exclusions";

describe("extractPredicatesFromFreeText", () => {
  it("pulls the proper noun out of the Chens' Stanford exclusion (RUBRIC S2)", () => {
    expect(
      extractPredicatesFromFreeText(["nothing affiliated with Stanford, my husband works there"]),
    ).toEqual(["stanford"]);
  });

  it("ignores leading-word stopwords and short tokens", () => {
    expect(extractPredicatesFromFreeText(["No big national orgs"])).toEqual([]);
  });
});

describe("buildExclusionPlan + isForbidden", () => {
  it("excludes the religion cause and religious name patterns (RUBRIC S2 HARD)", () => {
    const f = emptyFacets();
    f.exclusions.tags = ["religious"];
    const plan = buildExclusionPlan(f);
    expect(plan.excludedCauses).toContain("religion");
    expect(isForbidden({ name: "First Baptist Church", cause: "community" }, plan)).toBe(true);
    expect(isForbidden({ name: "Catholic Charities", cause: "human-services" }, plan)).toBe(true);
    expect(isForbidden({ name: "Oakland Food Bank", cause: "food-nutrition" }, plan)).toBe(false);
  });

  it("excludes political-advocacy orgs (RUBRIC S1)", () => {
    const f = emptyFacets();
    f.exclusions.tags = ["political_advocacy"];
    const plan = buildExclusionPlan(f);
    expect(isForbidden({ name: "Citizens Action Fund", cause: "social-advocacy" }, plan)).toBe(
      true,
    );
    expect(isForbidden({ name: "Food Bank", cause: "food-nutrition" }, plan)).toBe(false);
  });

  it("honors a free-text Stanford predicate by name and embedding text", () => {
    const f = emptyFacets();
    f.exclusions.freeText = ["nothing affiliated with Stanford"];
    const plan = buildExclusionPlan(f);
    expect(isForbidden({ name: "Stanford University", cause: "education" }, plan)).toBe(true);
    expect(
      isForbidden({ name: "Bay Area Tutors", embeddingText: "Partnered with Stanford labs" }, plan),
    ).toBe(true);
    expect(isForbidden({ name: "Berkeley Food Pantry", cause: "food-nutrition" }, plan)).toBe(
      false,
    );
  });

  it("scrub removes only forbidden orgs and keeps the rest", () => {
    const f = emptyFacets();
    f.exclusions.tags = ["religious"];
    const plan = buildExclusionPlan(f);
    const orgs = [
      { name: "Grace Ministries", cause: "religion" },
      { name: "Oakland Food Bank", cause: "food-nutrition" },
      { name: "Youth Coding Club", cause: "youth" },
    ];
    expect(scrub(orgs, plan).map((o) => o.name)).toEqual([
      "Oakland Food Bank",
      "Youth Coding Club",
    ]);
  });
});
