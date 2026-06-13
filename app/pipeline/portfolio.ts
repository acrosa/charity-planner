import daffyData from "../../data/daffy_portfolios.json";
import type { Facets } from "../lib/facets";
import type { FundOption, FundPortfolioRec } from "../lib/types";

// Deterministic facet → Daffy portfolio mapping ("Where your giving fund lives",
// BRIEF.md §7.6). No LLM call. Rules evaluated top to bottom, first match wins.
// Hard guarantees (RUBRIC spot-check): crypto NEVER unless explicitly mentioned;
// ESG only on a sustainability signal; the not-investment-advice disclaimer
// always renders; fund block omitted/forked cleanly when uncertain.

interface RawPortfolio {
  id: string;
  name: string;
  displayName: string;
  riskLevel: string;
  riskTier: number | null;
  tags: { esg: boolean; crypto: boolean; custom?: boolean };
  allocation: Record<string, number>;
  description: string;
  bestFor?: string;
}

const PORTFOLIOS = new Map<string, RawPortfolio>();
for (const p of daffyData.portfolios as RawPortfolio[]) PORTFOLIOS.set(p.id, p);
const CUSTOM = daffyData.custom as unknown as {
  id: string;
  name: string;
  displayName: string;
  description: string;
};
const DISCLAIMER = daffyData.meta.disclaimer as string;

const RISK_TO_TIER: Record<string, number> = { proven: 2, balanced: 3, experimental: 4 };

function tierOf(facets: Facets): number {
  return facets.risk ? RISK_TO_TIER[facets.risk] : 2;
}

/** ESG signal: environmental causes or sustainability-adjacent values. */
function esgSignal(facets: Facets): boolean {
  const text = facets.causes.join(" ").toLowerCase();
  return /environment|climate|sustainab|clean energy|conservation|ecolog/.test(text);
}

function allocationOf(p: RawPortfolio): { label: string; pct: number }[] {
  const order = ["equities", "bonds", "crypto", "cash"];
  const labels: Record<string, string> = {
    equities: "Equities",
    bonds: "Bonds",
    crypto: "Crypto",
    cash: "Cash",
  };
  return order
    .filter((k) => (p.allocation?.[k] ?? 0) > 0)
    .map((k) => ({ label: labels[k] ?? k, pct: p.allocation[k] }));
}

function toOption(id: string, forkLabel?: string): FundOption | null {
  const p = PORTFOLIOS.get(id);
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    displayName: p.displayName,
    riskLevel: p.riskLevel,
    blurb: p.bestFor || p.description,
    allocation: allocationOf(p),
    forkLabel,
  };
}

function customOption(): FundOption {
  return {
    id: CUSTOM.id,
    name: CUSTOM.name,
    displayName: CUSTOM.displayName,
    riskLevel: "custom",
    blurb: CUSTOM.description,
    allocation: [],
  };
}

function pick(id: string, reason: string, ruleId: string): FundPortfolioRec | null {
  const primary = toOption(id);
  if (!primary) return null;
  return { reason, isFork: false, primary, ruleId, disclaimer: DISCLAIMER };
}

/** Select the Daffy fund portfolio (or a fork) for the captured facets. */
export function selectFundPortfolio(facets: Facets): FundPortfolioRec | null {
  const tier = tierOf(facets);
  const horizon = facets.horizon;

  // 1. Crypto — only when explicitly mentioned.
  if (facets.crypto.mentioned) {
    let id: string;
    if (facets.crypto.coin) id = `crypto-${facets.crypto.coin}`;
    else if (facets.risk === "experimental") id = "crypto-diversified-aggressive";
    else id = "crypto-diversified-conservative";
    return pick(
      id,
      "Because you specifically mentioned crypto, this keeps a diversified core with a measured digital-asset sleeve.",
      "crypto-explicit",
    );
  }

  // 2. ESG — only on a sustainability signal, and only when horizon is known.
  if (esgSignal(facets) && horizon != null) {
    const id = tier >= 4 ? "esg-aggressive" : tier === 3 ? "esg-moderate" : "esg-conservative";
    return pick(
      id,
      "Your values point toward sustainability, so this matches your risk level with an ESG-screened mix.",
      "esg-by-risk",
    );
  }

  // 3. Near-term giving.
  if (horizon === "year_by_year") {
    return pick(
      "conservative-diversified-bonds",
      "Since you plan to give as you go, this protects your balance for near-term grants.",
      "near-term",
    );
  }

  // 4. Long horizon, by risk.
  if (horizon === "multi_year" || horizon === "lifetime" || horizon === "legacy") {
    const id =
      tier >= 4 ? "standard-aggressive" : tier === 3 ? "standard-growth" : "standard-balanced";
    return pick(
      id,
      "Because you'll grow your fund over time, this leans into growth at your risk level.",
      "long-horizon-by-risk",
    );
  }

  // 5. Default by risk (when risk is known but horizon isn't).
  if (facets.risk != null) {
    const id =
      tier >= 4 ? "standard-aggressive" : tier === 3 ? "standard-growth" : "standard-balanced";
    return pick(
      id,
      "This balances growth and stability based on the risk level you described.",
      "default-balanced",
    );
  }

  // 6. Horizon & risk unknown → present a fork as guidance, not a single pick.
  const giveAsYouGo = toOption("conservative-diversified-bonds", "if you give as you go");
  const growFirst = toOption("standard-growth", "if you grow your fund first");
  if (giveAsYouGo && growFirst) {
    return {
      reason:
        "We'd want to know your time horizon before picking one fund, so here's the fork: protect what you'll grant soon, or grow what you'll give later.",
      isFork: true,
      primary: giveAsYouGo,
      alternative: growFirst,
      ruleId: "fork-horizon-unknown",
      disclaimer: DISCLAIMER,
    };
  }
  return null;
}
