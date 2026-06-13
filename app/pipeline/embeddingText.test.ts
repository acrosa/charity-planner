import { describe, expect, it } from "vitest";
import { buildEmbeddingText, contentHash, isBothNull } from "./embeddingText";

describe("buildEmbeddingText", () => {
  it("leads with the name, then mission/description, then a cause/geo tail", () => {
    const text = buildEmbeddingText({
      ein: "1",
      name: "Alameda County Community Food Bank",
      mission: "Feeding families across Alameda County.",
      description: "A regional food bank.",
      cause: "food-nutrition",
      city: "Oakland",
      state: "CA",
    });
    expect(text.startsWith("Alameda County Community Food Bank")).toBe(true);
    expect(text).toContain("Feeding families");
    expect(text).toContain("Cause area: food-nutrition.");
    expect(text).toContain("Located in Oakland, CA.");
  });

  it("omits empty fields cleanly", () => {
    const text = buildEmbeddingText({
      ein: "2",
      name: "Solo Org",
      mission: null,
      description: null,
    });
    expect(text).toBe("Solo Org");
  });

  it("caps length", () => {
    const text = buildEmbeddingText({ ein: "3", name: "X", description: "y".repeat(10_000) });
    expect(text.length).toBeLessThanOrEqual(6000);
  });
});

describe("contentHash", () => {
  it("is stable and changes with content", () => {
    expect(contentHash("abc")).toBe(contentHash("abc"));
    expect(contentHash("abc")).not.toBe(contentHash("abd"));
  });
});

describe("isBothNull", () => {
  it("is true only when mission and description are both empty", () => {
    expect(isBothNull({ ein: "1", name: "X" })).toBe(true);
    expect(isBothNull({ ein: "1", name: "X", mission: "  " })).toBe(true);
    expect(isBothNull({ ein: "1", name: "X", description: "y" })).toBe(false);
  });
});
