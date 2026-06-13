import type { ExclusionTag, Facets } from "../lib/facets";

// Turns captured exclusions (structured tags + free-text) into:
//   - a set of `cause` slugs to drop in SQL,
//   - a set of forbidden substrings matched against name + embedding_text.
// Both the SQL recall filter and the final JS scrub use the SAME forbidden set,
// so "zero forbidden orgs in the top 10" (RUBRIC) holds by construction.

interface TagRule {
  causes: string[]; // exact dataset cause slugs to exclude
  patterns: string[]; // lowercase substrings forbidden in name / embedding_text
}

// Patterns are deliberately specific to avoid nuking legitimate orgs (e.g. we
// don't blanket-ban "health" for hospitals — only hospital-system phrasing).
const TAG_RULES: Record<ExclusionTag, TagRule> = {
  political_advocacy: {
    causes: ["social-advocacy"],
    patterns: [
      "political",
      "advocacy",
      "lobby",
      "lobbying",
      "action fund",
      "action network",
      "super pac",
      " pac ",
      "campaign committee",
      "for congress",
      "for senate",
      "republican",
      "democrat",
      "libertarian",
      "voter",
      "ballot",
      "legislativ",
      "policy action",
    ],
  },
  religious: {
    causes: ["religion"],
    patterns: [
      "church",
      "ministry",
      "ministries",
      "diocese",
      "archdiocese",
      "parish",
      "synagogue",
      "mosque",
      "temple",
      "congregation",
      "catholic",
      "christian",
      "baptist",
      "methodist",
      "lutheran",
      "presbyterian",
      "episcopal",
      "evangel",
      "gospel",
      "missionary",
      "missions",
      "jewish",
      "judaism",
      "islamic",
      "muslim",
      "torah",
      "chabad",
      "diocesan",
      "bible",
      "faith-based",
      "pastoral",
      "salvation army",
    ],
  },
  international: {
    causes: ["international"],
    patterns: ["international", "global ", "worldwide", "overseas", "foreign"],
  },
  hospitals: {
    causes: [],
    patterns: ["hospital", "medical center", "health system", "clinic", "infirmary"],
  },
  universities: {
    causes: [],
    patterns: ["university", "college", "polytechnic", "institute of technology"],
  },
};

const STOPWORDS = new Set([
  "Nothing",
  "No",
  "Please",
  "My",
  "The",
  "I",
  "We",
  "And",
  "But",
  "Also",
  "Avoid",
  "Exclude",
]);

/**
 * Heuristic: pull proper-noun keywords out of a free-text exclusion so a phrase
 * like "nothing affiliated with Stanford, my husband works there" yields
 * ["stanford"]. Used as a deterministic fallback alongside LLM-extracted predicates.
 */
export function extractPredicatesFromFreeText(phrases: string[]): string[] {
  const out = new Set<string>();
  for (const phrase of phrases) {
    for (const m of phrase.matchAll(/\b([A-Z][a-zA-Z&.'-]{3,})\b/g)) {
      const word = m[1];
      if (!STOPWORDS.has(word)) out.add(word.toLowerCase());
    }
  }
  return [...out];
}

export interface ExclusionPlan {
  excludedCauses: string[];
  forbiddenPatterns: string[]; // lowercase substrings
  tags: ExclusionTag[];
}

/** Build the exclusion plan from facets + any LLM-extracted predicates. */
export function buildExclusionPlan(facets: Facets, llmPredicates: string[] = []): ExclusionPlan {
  const excludedCauses = new Set<string>();
  const patterns = new Set<string>();

  for (const tag of facets.exclusions.tags) {
    const rule = TAG_RULES[tag];
    for (const c of rule.causes) excludedCauses.add(c);
    for (const p of rule.patterns) patterns.add(p);
  }

  for (const p of extractPredicatesFromFreeText(facets.exclusions.freeText)) patterns.add(p);
  for (const p of llmPredicates) {
    const norm = p.trim().toLowerCase();
    if (norm.length >= 3) patterns.add(norm);
  }

  return {
    excludedCauses: [...excludedCauses],
    forbiddenPatterns: [...patterns],
    tags: facets.exclusions.tags,
  };
}

export interface Scrubbable {
  name: string;
  cause?: string | null;
  embeddingText?: string | null;
  mission?: string | null;
  description?: string | null;
}

/** True if the org violates the plan (should be removed). */
export function isForbidden(c: Scrubbable, plan: ExclusionPlan): boolean {
  if (c.cause && plan.excludedCauses.includes(c.cause)) return true;
  const hay = `${c.name} ${c.cause ?? ""} ${c.embeddingText ?? ""} ${c.mission ?? ""} ${c.description ?? ""}`.toLowerCase();
  return plan.forbiddenPatterns.some((p) => hay.includes(p));
}

/** Keep-filter convenience: returns the orgs that pass the exclusion plan. */
export function scrub<T extends Scrubbable>(orgs: T[], plan: ExclusionPlan): T[] {
  return orgs.filter((o) => !isForbidden(o, plan));
}
