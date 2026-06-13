import type { FundOption, FundPortfolioRec } from "~/lib/types";
import { PaperCard } from "./PaperCard";

// "Where your giving fund lives" — a small terracotta slip naming a real Daffy
// portfolio (or a fork when the horizon is unknown). The not-investment-advice
// disclaimer always renders (RUBRIC spot-check).
function Option({ opt }: { opt: FundOption }) {
  return (
    <div>
      {opt.forkLabel && (
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] opacity-80">
          {opt.forkLabel}
        </p>
      )}
      <p className="mt-1 font-display text-xl" style={{ fontWeight: 500 }}>
        {opt.displayName}
      </p>
      <p className="mt-1 text-[14px] opacity-90">{opt.blurb}</p>
      {opt.allocation.length > 0 && (
        <p className="mt-2 font-mono text-[12px] opacity-80">
          {opt.allocation.map((a) => `${a.label} ${a.pct}%`).join(" · ")}
        </p>
      )}
    </div>
  );
}

export function FundPortfolioCard({ fund }: { fund: FundPortfolioRec }) {
  return (
    <PaperCard tone="terracotta" rotate={1.2}>
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] opacity-80">
        Where your giving fund lives
      </p>
      <p className="mt-3 text-[15px] leading-relaxed">{fund.reason}</p>
      <div className={`mt-5 ${fund.isFork ? "grid gap-6 sm:grid-cols-2" : ""}`}>
        <Option opt={fund.primary} />
        {fund.alternative && <Option opt={fund.alternative} />}
      </div>
      <p className="mt-6 border-t border-[var(--color-background)]/20 pt-3 text-[12px] opacity-70">
        {fund.disclaimer}
      </p>
    </PaperCard>
  );
}
