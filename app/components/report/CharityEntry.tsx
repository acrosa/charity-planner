import { motion, useReducedMotion } from "motion/react";
import { causeColor } from "~/lib/causeColor";
import type { CharityRec } from "~/lib/types";

// Typographic charity entry (DESIGN.md §6). Dashed rank stamp + mono metadata,
// serif name, why-line, news line. A short cause-tinted rule is the only color.
// The name + an explicit CTA link to Daffy; the news source is its own link.
// No wrapping anchor (avoids nested <a>); hover raises 3px + extends the rule.
export function CharityEntry({
  c,
  index,
  newsLoading = false,
}: {
  c: CharityRec;
  index: number;
  newsLoading?: boolean;
}) {
  const reduce = useReducedMotion();
  const tint = causeColor(c.causeBucket);
  const loc = [c.city, c.state].filter(Boolean).join(", ").toUpperCase();
  const rank = String(c.rank).padStart(2, "0");

  return (
    <motion.div
      className="group py-6"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.36) }}
      whileHover={reduce ? undefined : { y: -3 }}
    >
      <div className="flex items-baseline gap-3">
        <span className="inline-flex items-center justify-center rounded-[4px] border border-dashed border-[var(--color-muted)] px-2 py-0.5 font-mono text-[10px] tracking-[0.08em] text-[var(--color-muted)]">
          Nº {rank}
        </span>
        {loc && (
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
            {loc}
          </span>
        )}
      </div>

      {/* cause-tinted rule — grows to full width on hover */}
      <div
        className="mt-3 h-[3px] w-12 origin-left transition-[width] duration-200 group-hover:w-full"
        style={{ backgroundColor: tint }}
      />

      <h3
        className="mt-3 font-display leading-tight"
        style={{ fontWeight: 500, fontSize: "clamp(1.3rem, 2vw, 1.7rem)" }}
      >
        <a
          href={c.daffyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="decoration-[var(--color-hairline)] underline-offset-4 hover:underline"
        >
          {c.name}
        </a>
      </h3>

      <p className="mt-2 max-w-2xl text-[var(--color-foreground)]">{c.whyLine}</p>

      {c.amount > 0 && (
        <p className="mt-2 font-mono text-[12px] tracking-[0.04em] text-[var(--color-muted)]">
          ${c.amount % 1 === 0 ? c.amount : c.amount.toFixed(2)}
          {c.role === "anchor" ? " · anchor" : c.role === "explorer" ? " · explorer" : ""}
        </p>
      )}

      {c.news ? (
        <p className="mt-2 max-w-2xl text-[13px] text-[var(--color-muted)]">
          {c.news.line}{" "}
          <a
            href={c.news.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-[var(--color-hairline)] underline-offset-2 hover:text-[var(--color-foreground)]"
          >
            {c.news.sourceTitle}
          </a>
        </p>
      ) : newsLoading ? (
        <span className="news-shimmer mt-3 block h-3 w-2/3 max-w-md rounded" aria-hidden />
      ) : null}

      <a
        href={c.daffyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block font-semibold text-[var(--color-daffy)]"
      >
        Give on Daffy →
      </a>
    </motion.div>
  );
}
