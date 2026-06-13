import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Charity Planner — philanthropic advice for everyone" },
    {
      name: "description",
      content:
        "A short conversation turns your values into a researched, transparent, actionable giving strategy — and a clear path to act on it through Daffy.",
    },
  ];
}

// Skeleton landing. The full editorial poster (wordmark + vignettes + explainer
// trio + begin CTA) lands in the interview/landing feature. This placeholder
// establishes the grid, type hierarchy, and tokens so the deploy reads as the
// composed page described in DESIGN.md §Interaction-spec.1.
export default function Home() {
  return (
    <main className="min-h-screen px-[clamp(24px,5vw,96px)] py-[clamp(32px,6vh,96px)]">
      <header className="flex items-baseline justify-between font-mono text-[12px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
        <span>charity planner</span>
        <span>● begin</span>
      </header>

      <section className="mt-[12vh] max-w-4xl">
        <h1
          className="font-display lowercase leading-[1.05] tracking-[-0.01em]"
          style={{ fontWeight: 600, fontSize: "clamp(4rem, 10vw, 9rem)" }}
        >
          charity
          <br />
          planner
          <span className="ml-3 inline-block size-[0.12em] translate-y-[-0.6em] bg-[var(--color-terracotta)] align-baseline" />
        </h1>

        <p
          className="mt-12 max-w-2xl font-display lowercase text-[var(--color-foreground)]"
          style={{ fontWeight: 380, fontSize: "clamp(1.6rem, 3vw, 2.4rem)", lineHeight: 1.3 }}
        >
          philanthropic advice for <em>everyone</em>.
        </p>
      </section>

      <section className="mt-[16vh]">
        <a
          href="/?mode=quick"
          className="font-display lowercase text-[var(--color-foreground)] transition-transform"
          style={{ fontWeight: 380, fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
        >
          begin <span className="text-[var(--color-terracotta)]">→</span>
        </a>
      </section>
    </main>
  );
}
