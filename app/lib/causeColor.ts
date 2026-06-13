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

// Maps the raw dataset cause slug to the nearest tint bucket. Extend the
// aliases as real slugs surface during ingest; unknowns fall back to grey.
const CAUSE_ALIASES: Record<string, CauseBucket> = {
  health: "health",
  healthcare: "health",
  medical: "health",
  "human-rights": "human-rights",
  "human rights": "human-rights",
  "civil-rights": "human-rights",
  education: "education",
  schools: "education",
  youth: "education",
  justice: "justice",
  legal: "justice",
  research: "research",
  science: "research",
  scientific: "research",
  environment: "environment",
  climate: "environment",
  conservation: "environment",
  arts: "arts",
  culture: "arts",
  "arts-culture": "arts",
  animals: "animals",
  wildlife: "animals",
  "animal-welfare": "animals",
  food: "food",
  hunger: "food",
  "food-security": "food",
  faith: "faith",
  religion: "faith",
  religious: "faith",
};

export function causeBucket(cause: string | null | undefined): CauseBucket {
  if (!cause) return "fallback";
  const key = cause.trim().toLowerCase();
  return CAUSE_ALIASES[key] ?? "fallback";
}

export function causeColor(cause: string | null | undefined): string {
  return CAUSE_HEX[causeBucket(cause)];
}
