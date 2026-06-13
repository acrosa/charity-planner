import { motion } from "motion/react";
import { Vignette } from "~/components/Vignette";
import { CAUSE_HEX } from "~/lib/causeColor";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Charity Planner — philanthropic planning for everyone" },
    {
      name: "description",
      content:
        "A short conversation turns your values into a researched, transparent, actionable giving strategy — and a clear path to act on it through Daffy.",
    },
  ];
}

const EYEBROWS = [
  {
    label: "WHAT IT IS",
    lines: [
      "Philanthropic advice has always been a service for the wealthy — advisors paid thousands to turn values into a giving strategy.",
      "Charity Planner makes that free, for everyone.",
    ],
  },
  {
    label: "HOW IT WORKS",
    lines: [
      "A short, warm interview learns what you care about, where, and how you want to give.",
      "We research 10,000 charities and build a transparent portfolio — every figure shows its reasoning.",
    ],
  },
  {
    label: "WHERE IT LEADS",
    lines: [
      "A clear plan with exact dollar allocations and a recommended fund.",
      "Then a one-click path to make it real on Daffy.",
    ],
  },
];

// Landing — an editorial poster (DESIGN.md §1). Content staggered asymmetrically
// down the 12-col grid; the only scrolling screen besides the report.
export default function Home() {
  const orbitTints = [
    CAUSE_HEX.food,
    CAUSE_HEX.education,
    CAUSE_HEX.environment,
    CAUSE_HEX.animals,
    CAUSE_HEX.health,
    CAUSE_HEX.research,
    CAUSE_HEX["human-rights"],
  ];

  return (
    <main className="min-h-screen px-[clamp(24px,5vw,96px)] py-[clamp(28px,5vh,72px)]">
      {/* Top line: wordmark + begin */}
      <div className="flex items-start justify-between font-mono text-[12px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
        <span className="text-[var(--color-foreground)]">charity planner</span>
        <a href="#begin" className="hover:text-[var(--color-foreground)]">
          ● begin
        </a>
      </div>

      {/* Wordmark huge */}
      <motion.h1
        className="mt-[8vh] font-display lowercase leading-[0.95] tracking-[-0.02em]"
        style={{ fontWeight: 600, fontSize: "clamp(4rem, 10vw, 9rem)" }}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        charity
        <br />
        planner
        <span className="ml-2 inline-block size-[0.1em] translate-y-[0.05em] bg-[var(--color-terracotta)] align-baseline" />
      </motion.h1>

      {/* Tagline, offset right */}
      <motion.p
        className="mt-10 ml-[8%] max-w-2xl font-display lowercase"
        style={{ fontWeight: 380, fontSize: "clamp(1.6rem, 3.4vw, 2.6rem)", lineHeight: 1.25 }}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
      >
        philanthropic planning for <em>everyone</em>.
      </motion.p>

      {/* Scene vignettes — pinned prints, misaligned */}
      <div className="mt-[12vh] grid grid-cols-1 gap-y-16 sm:grid-cols-12 sm:gap-x-8">
        <Vignette
          mode="interview"
          facetCount={5}
          caption="the interview"
          size={300}
          className="sm:col-span-4 sm:col-start-1"
        />
        <Vignette
          mode="loading"
          caption="10,000 charities"
          size={340}
          className="sm:col-span-5 sm:col-start-6 sm:mt-16"
        />
        <Vignette
          mode="report"
          points={orbitTints}
          caption="your portfolio"
          size={300}
          className="sm:col-span-3 sm:col-start-10 sm:-mt-8"
        />
      </div>

      {/* Explainer trio — eyebrow pattern, diagonal bands */}
      <div className="mt-[14vh] grid grid-cols-1 gap-12 sm:grid-cols-12">
        {EYEBROWS.map((e, i) => (
          <motion.div
            key={e.label}
            className={
              i === 0
                ? "sm:col-span-4 sm:col-start-1"
                : i === 1
                  ? "sm:col-span-4 sm:col-start-6 sm:mt-12"
                  : "sm:col-span-4 sm:col-start-9 sm:mt-24"
            }
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: i * 0.08 }}
          >
            <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
              <span className="text-[var(--color-terracotta)]">●</span> {e.label}
            </p>
            {e.lines.map((l) => (
              <p key={l} className="mt-3 text-[17px] leading-relaxed">
                {l}
              </p>
            ))}
          </motion.div>
        ))}
      </div>

      {/* Footer CTA */}
      <section id="begin" className="mt-[16vh] flex flex-wrap items-baseline gap-x-10 gap-y-4">
        <a
          href="/plan"
          className="group font-display lowercase text-[var(--color-foreground)]"
          style={{ fontWeight: 380, fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
        >
          begin{" "}
          <span className="inline-block text-[var(--color-terracotta)] transition-transform group-hover:translate-x-2">
            →
          </span>
        </a>
        <a
          href="/plan?mode=quick"
          className="font-mono text-[13px] uppercase tracking-[0.08em] text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
        >
          ● quick — 3 questions
        </a>
      </section>

      <footer className="mt-24 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
        data: 10,000 U.S. nonprofits · built for Claude Build Day · acts on Daffy
      </footer>
    </main>
  );
}
