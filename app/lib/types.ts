import type { CauseBucket } from "./causeColor";
import type { Facets } from "./facets";

// The report payload returned by /api/recommend and rendered by the report page.
// These are OUR shapes (not LLM output); LLM fragments are validated separately
// then composed in here.

export interface NewsItem {
  line: string;
  sourceUrl: string;
  sourceTitle: string;
}

export interface CharityRec {
  ein: string;
  name: string;
  mission: string | null;
  cause: string | null;
  causeBucket: CauseBucket;
  city: string | null;
  state: string | null;
  website: string | null;
  logoUrl: string | null;
  rank: number; // 1-based
  role: "anchor" | "explorer" | "core";
  weight: number; // relative allocation weight
  pct: number; // rounded % of giving (display)
  amount: number; // dollars at the chosen cadence
  whyLine: string; // first-person, references the donor's own terms
  daffyUrl: string; // daffy.org/charities/{ein}
  news?: NewsItem | null;
}

export interface PortfolioSlice {
  ein: string;
  name: string;
  pct: number;
  amount: number;
  causeBucket: CauseBucket;
}

export interface CauseComposition {
  bucket: CauseBucket;
  label: string;
  pct: number;
}

export interface Portfolio {
  cadence: "monthly" | "annual" | "one_time" | null;
  total: number; // dollars; null-budget reports use percentages only
  hasConcreteBudget: boolean;
  reservePct: number | null;
  reserveAmount: number | null;
  intro: string;
  items: PortfolioSlice[];
  compositionByCause: CauseComposition[];
}

export interface PlanItem {
  label: string;
  amount: number | null; // null when budget unknown (percentage framing)
  note?: string;
}

export interface FundOption {
  id: string;
  name: string;
  displayName: string;
  riskLevel: string;
  blurb: string;
  allocation: { label: string; pct: number }[];
  forkLabel?: string; // e.g. "if you give as you go" (fork mode only)
}

export interface FundPortfolioRec {
  reason: string; // why this portfolio, from the deterministic rule that matched
  isFork: boolean; // true when horizon is unknown and we present a fork (BRIEF §7.6)
  primary: FundOption;
  alternative?: FundOption; // the second fork branch
  ruleId: string;
  disclaimer: string;
}

export interface StrategySection {
  title: string;
  body: string;
}

export interface SummaryTrio {
  causes: string;
  budget: string;
  cadence: string;
}

export interface Report {
  facets: Facets;
  mode: "quick" | "full";
  philosophy: string;
  highlightTerms: string[]; // donor's key words to render as inline chips
  summaryTrio: SummaryTrio;
  strategySections: StrategySection[];
  portfolio: Portfolio;
  charities: CharityRec[];
  plan: { intro: string; items: PlanItem[] };
  fundPortfolio: FundPortfolioRec | null;
  meta: {
    totalCorpus: number;
    generatedAtISO: string;
    candidateCount: number;
  };
}
