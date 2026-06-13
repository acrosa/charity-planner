// The ONE place dataset `cause` slugs map to a tint bucket and a literal hex.
//
// SVG and recharts fills must use these hex strings directly — passing a CSS
// variable (e.g. `var(--color-cause-health)`) makes `<Cell fill>` / `<circle
// fill>` render black. See DESIGN.md §Tokens (last paragraph). The values here
// mirror the @theme tokens in app.css; keep them in sync.

export type CauseBucket =
  | "health"
  | "human-rights"
  | "education"
  | "justice"
  | "research"
  | "environment"
  | "arts"
  | "animals"
  | "food"
  | "faith"
  | "fallback";

export const CAUSE_HEX: Record<CauseBucket, string> = {
  health: "#f39e9e",
  "human-rights": "#ffb2e0",
  education: "#c6adf8",
  justice: "#a1b0e0",
  research: "#a0c4de",
  environment: "#a4dd9f",
  arts: "#c8d18e",
  animals: "#d1ae94",
  food: "#fec398",
  faith: "#f3e9aa",
  fallback: "#ddd8c9",
};

// Maps the raw dataset `cause` slug to the nearest tint bucket. Covers every
// slug present in dataset/charities_10k.jsonl; unknowns fall back to grey.
const CAUSE_ALIASES: Record<string, CauseBucket> = {
  // health
  healthcare: "health",
  "mental-health": "health",
  "disaster-relief": "health",
  health: "health",
  // education
  education: "education",
  youth: "education",
  // research
  "science-tech": "research",
  "social-science": "research",
  research: "research",
  // environment
  environment: "environment",
  // arts
  "arts-culture": "arts",
  sports: "arts",
  arts: "arts",
  // animals
  animals: "animals",
  // food
  "food-nutrition": "food",
  food: "food",
  // faith
  religion: "faith",
  faith: "faith",
  // justice
  "criminal-justice": "justice",
  "social-advocacy": "justice",
  justice: "justice",
  // human-rights bucket (social/relief/community services)
  "human-services": "human-rights",
  "homelessness-housing": "human-rights",
  international: "human-rights",
  employment: "human-rights",
  community: "human-rights",
  "public-services": "human-rights",
  "human-rights": "human-rights",
  // fallback-ish
  "philanthropy-and-foundations": "fallback",
  "membership-benefits": "fallback",
  "unknown-other": "fallback",
};

export function causeBucket(cause: string | null | undefined): CauseBucket {
  if (!cause) return "fallback";
  const key = cause.trim().toLowerCase();
  return CAUSE_ALIASES[key] ?? "fallback";
}

export function causeColor(cause: string | null | undefined): string {
  return CAUSE_HEX[causeBucket(cause)];
}
