import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { causeColor } from "~/lib/causeColor";
import type { Portfolio } from "~/lib/types";

// Allocation donut for the butter portfolio card. recharts <Cell fill> MUST use
// literal hex (causeColor), never a CSS var — vars render black (DESIGN.md §Tokens).
export function PortfolioChart({ portfolio }: { portfolio: Portfolio }) {
  const data = portfolio.items.map((it) => ({
    name: it.name,
    value: it.pct,
    bucket: it.causeBucket,
    amount: it.amount,
  }));
  // Reserve, if present, shown as a muted slice.
  if (portfolio.reservePct) {
    data.push({
      name: "Reserve",
      value: portfolio.reservePct,
      bucket: "fallback",
      amount: portfolio.reserveAmount ?? 0,
    });
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="92%"
            startAngle={90}
            endAngle={-270}
            paddingAngle={1.5}
            stroke="none"
            isAnimationActive
            animationBegin={200}
            animationDuration={800}
          >
            {data.map((d, i) => (
              <Cell
                // biome-ignore lint/suspicious/noArrayIndexKey: stable slice order
                key={i}
                fill={
                  d.bucket === "fallback" && d.name === "Reserve" ? "#d9d6cb" : causeColor(d.bucket)
                }
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {/* circled total in the hole */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {portfolio.hasConcreteBudget ? (
          <>
            <span className="font-display text-3xl" style={{ fontWeight: 500 }}>
              ${portfolio.total}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
              {portfolio.cadence === "monthly" ? "per month" : (portfolio.cadence ?? "")}
            </span>
          </>
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
            shares
          </span>
        )}
      </div>
    </div>
  );
}
