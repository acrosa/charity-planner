import { z } from "zod";

// The interview's captured-facet payload. Every field is nullable and defaults
// to "not captured" — the interview and report MUST NEVER fabricate a facet the
// user didn't give (RUBRIC S1/S3). Validated with safeParse at every boundary.

export const GeoScope = z.enum(["local", "regional", "national", "global"]);
export type GeoScope = z.infer<typeof GeoScope>;

// Structured exclusions we can filter reliably in SQL (see pipeline/exclusions.ts).
// Anything else the user says goes into `freeText` and is honored via extracted
// predicates + a final scrub.
export const ExclusionTag = z.enum([
  "political_advocacy",
  "religious",
  "international",
  "hospitals",
  "universities",
]);
export type ExclusionTag = z.infer<typeof ExclusionTag>;

export const StrategyKind = z.enum(["concentrate", "broaden", "broaden_then_focus"]);
export const RiskKind = z.enum(["established", "newer_ok"]);
export const ChangeKind = z.enum(["incremental", "systemic"]);
export const OutcomesKind = z.enum(["wants_evidence", "flexible"]);
export const HorizonKind = z.enum(["one_year", "multi_year"]);
export const Cadence = z.enum(["monthly", "annual", "one_time"]);

export const GeoSchema = z.object({
  raw: z.string().nullable().default(null),
  scope: GeoScope.nullable().default(null),
  state: z.string().length(2).nullable().default(null), // 2-letter US code, uppercased
  city: z.string().nullable().default(null),
});

export const ExclusionsSchema = z.object({
  tags: z.array(ExclusionTag).default([]),
  freeText: z.array(z.string()).default([]),
});

export const BudgetSchema = z.object({
  amount: z.number().nonnegative().nullable().default(null),
  cadence: Cadence.nullable().default(null),
});

export const FacetsSchema = z.object({
  causes: z.array(z.string()).default([]),
  geo: GeoSchema.default({ raw: null, scope: null, state: null, city: null }),
  exclusions: ExclusionsSchema.default({ tags: [], freeText: [] }),
  budget: BudgetSchema.default({ amount: null, cadence: null }),
  strategy: StrategyKind.nullable().default(null),
  risk: RiskKind.nullable().default(null),
  change: ChangeKind.nullable().default(null),
  outcomes: OutcomesKind.nullable().default(null),
  horizon: HorizonKind.nullable().default(null),
  discretionaryReserve: z.boolean().nullable().default(null),
});

export type Facets = z.infer<typeof FacetsSchema>;

export function emptyFacets(): Facets {
  return FacetsSchema.parse({});
}

/** Annotation drawn into the interview margin (Caveat) the moment a facet lands. */
export interface FacetAnnotation {
  type: "geo" | "values" | "budget" | "exclusion" | "strategy" | "horizon" | "risk";
  glyph: "pin" | "heart" | "dollar" | "cross" | "star";
  label: string;
}

const GLYPH: Record<FacetAnnotation["type"], FacetAnnotation["glyph"]> = {
  geo: "pin",
  values: "heart",
  budget: "dollar",
  exclusion: "cross",
  strategy: "star",
  horizon: "star",
  risk: "star",
};

function money(amount: number): string {
  return amount % 1 === 0 ? `$${amount}` : `$${amount.toFixed(2)}`;
}

const STRATEGY_LABEL: Record<z.infer<typeof StrategyKind>, string> = {
  concentrate: "concentrate giving",
  broaden: "spread it broadly",
  broaden_then_focus: "broaden, then focus",
};

/** Build the full set of margin annotations implied by the captured facets. */
export function facetAnnotations(f: Facets): FacetAnnotation[] {
  const out: FacetAnnotation[] = [];
  for (const c of f.causes) out.push({ type: "values", glyph: GLYPH.values, label: c });
  if (f.geo.raw || f.geo.city || f.geo.state) {
    out.push({
      type: "geo",
      glyph: GLYPH.geo,
      label: f.geo.city || f.geo.raw || f.geo.state || "location",
    });
  }
  if (f.budget.amount != null) {
    const cad = f.budget.cadence === "monthly" ? "/mo" : f.budget.cadence === "annual" ? "/yr" : "";
    out.push({ type: "budget", glyph: GLYPH.dollar, label: `${money(f.budget.amount)}${cad}` });
  }
  for (const t of f.exclusions.tags) {
    out.push({ type: "exclusion", glyph: GLYPH.cross, label: `no ${t.replace(/_/g, " ")}` });
  }
  for (const ft of f.exclusions.freeText) {
    out.push({ type: "exclusion", glyph: GLYPH.cross, label: ft.length > 36 ? `${ft.slice(0, 34)}…` : ft });
  }
  if (f.strategy) out.push({ type: "strategy", glyph: GLYPH.star, label: STRATEGY_LABEL[f.strategy] });
  return out;
}

/** Stable key for an annotation, used to detect which are newly captured. */
export function annotationKey(a: FacetAnnotation): string {
  return `${a.type}:${a.label.toLowerCase()}`;
}

/** Annotations present in `next` but not in `prev` — the ones to animate in. */
export function newAnnotations(prev: Facets, next: Facets): FacetAnnotation[] {
  const seen = new Set(facetAnnotations(prev).map(annotationKey));
  return facetAnnotations(next).filter((a) => !seen.has(annotationKey(a)));
}
