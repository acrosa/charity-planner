import { motion } from "motion/react";
import { causeColor } from "~/lib/causeColor";
import type { Report as ReportType } from "~/lib/types";
import { WordStream } from "../WordStream";
import { CharityEntry } from "./CharityEntry";
import { DaffyFooter } from "./DaffyFooter";
import { FundPortfolioCard } from "./FundPortfolioCard";
import { PaperCard } from "./PaperCard";
import { PortfolioChart } from "./PortfolioChart";

// Highlights the donor's key terms inside the philosophy as cause-tinted chips.
function PhilosophyText({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0) return <WordStream text={text} className="font-display" as="span" />;
  const escaped = terms
    .filter(Boolean)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .sort((a, b) => b.length - a.length);
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <span className="font-display">
      {parts.map((part, i) =>
        re.test(part) ? (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: stable split index
            key={i}
            className="rounded-[3px] px-1"
            style={{ backgroundColor: "var(--color-cause-education)", color: "#1B1A17" }}
          >
            {part}
          </span>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: stable split index
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

function money(n: number): string {
  return n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;
}

export function Report({
  report,
  newsLoading = false,
}: {
  report: ReportType;
  newsLoading?: boolean;
}) {
  const { portfolio, charities, plan, summaryTrio, strategySections, fundPortfolio } = report;

  return (
    <div className="px-[clamp(24px,5vw,96px)] pb-32">
      {/* Report header */}
      <header className="mx-auto max-w-3xl pt-8">
        <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
          Your giving plan · Nº 0042
        </p>
        <h1
          className="mt-4 font-display leading-[1.05]"
          style={{ fontWeight: 380, fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
        >
          A plan made <em>for</em> you.
        </h1>

        {/* Summary trio — icon chips */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[
            {
              glyph: "♥",
              label: "Your causes",
              value: summaryTrio.causes,
              tint: "var(--color-terracotta)",
            },
            {
              glyph: "$",
              label: "Your budget",
              value: summaryTrio.budget,
              tint: "var(--color-butter)",
            },
            {
              glyph: "↻",
              label: "Your cadence",
              value: summaryTrio.cadence,
              tint: "var(--color-foreground)",
            },
          ].map((s) => (
            <div key={s.label} className="flex items-start gap-3">
              <span
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] text-[var(--color-background)]"
                style={{ backgroundColor: s.tint }}
                aria-hidden
              >
                {s.glyph}
              </span>
              <span>
                <span className="block font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
                  {s.label}
                </span>
                <span className="block font-display text-lg" style={{ fontWeight: 500 }}>
                  {s.value}
                </span>
              </span>
            </div>
          ))}
        </div>
      </header>

      {/* Philosophy + strategy — letter on cream */}
      <section className="mx-auto mt-16 max-w-3xl">
        <PaperCard tone="cream" rotate={-1.2}>
          <p className="leading-[1.35]" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>
            <PhilosophyText text={report.philosophy} terms={report.highlightTerms} />
          </p>
          <motion.svg
            viewBox="0 0 300 12"
            className="mt-4 h-3 w-64"
            aria-hidden
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <motion.path
              d="M2 8 C 60 2, 120 12, 180 6 S 280 4, 298 8"
              fill="none"
              stroke="#c7552b"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </motion.svg>

          <div className="mt-8 space-y-6">
            {strategySections.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <h2 className="font-display text-xl" style={{ fontWeight: 500 }}>
                  {s.title}
                </h2>
                <p className="mt-1 text-[var(--color-foreground)]">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </PaperCard>
      </section>

      {/* Portfolio — butter card */}
      <section className="mx-auto mt-12 max-w-3xl">
        <PaperCard tone="butter" rotate={1.5} delay={0.1}>
          <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start">
            <div className="w-full sm:w-1/2">
              <p className="font-mono text-[11px] uppercase tracking-[0.08em]">Your portfolio</p>
              <h2 className="mt-2 font-display text-2xl" style={{ fontWeight: 500 }}>
                Where it goes
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed">{portfolio.intro}</p>
              <ul className="mt-4 space-y-1.5 text-[14px]">
                {portfolio.compositionByCause.map((cc) => (
                  <li key={cc.bucket} className="flex items-center gap-2">
                    <span
                      className="inline-block size-3 rounded-full"
                      style={{ backgroundColor: causeColor(cc.bucket) }}
                    />
                    <span>
                      {cc.label} — {cc.pct}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="w-full sm:w-1/2">
              <PortfolioChart portfolio={portfolio} />
            </div>
          </div>
        </PaperCard>
      </section>

      {/* Charity entries — typographic on the field */}
      <section className="mx-auto mt-16 max-w-3xl">
        <h2 className="font-display text-2xl" style={{ fontWeight: 500 }}>
          Your researched shortlist
        </h2>
        <div className="mt-2 divide-y divide-[var(--color-hairline)]">
          {charities.map((c, i) => (
            <CharityEntry key={c.ein} c={c} index={i} newsLoading={newsLoading} />
          ))}
        </div>
      </section>

      {/* The plan — receipt paper */}
      <section className="mx-auto mt-12 max-w-3xl">
        <PaperCard tone="receipt" rotate={-0.8} delay={0.1}>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
            The plan
          </p>
          <p className="mt-2 text-[15px]">{plan.intro}</p>
          <ul className="mt-4 space-y-2">
            {plan.items.map((it) => (
              <li
                key={it.label}
                className="flex items-baseline justify-between gap-4 font-mono text-[13px]"
              >
                <span className="text-[var(--color-foreground)]">{it.label}</span>
                <span className="flex-1 border-b border-dotted border-[var(--color-muted)]/40" />
                <span className="tabular-nums">
                  {it.amount != null ? money(it.amount) : it.note}
                </span>
              </li>
            ))}
          </ul>
        </PaperCard>
      </section>

      {/* Fund portfolio recommendation */}
      {fundPortfolio && (
        <section className="mx-auto mt-12 max-w-3xl">
          <FundPortfolioCard fund={fundPortfolio} />
        </section>
      )}

      {/* Daffy footer CTA */}
      <DaffyFooter report={report} />
    </div>
  );
}
