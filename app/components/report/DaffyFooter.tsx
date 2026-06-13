import { useState } from "react";
import type { Report } from "~/lib/types";

// "Make it real on Daffy" (DESIGN.md §footer). A large section pitching the Daffy
// donor-advised fund, with the big Daffy-green CTA. Share + upsell are secondary.
const PITCH = [
  "Contribute once — cash, stock, or crypto — and take your tax deduction now.",
  "Grant to 1.5M+ charities anytime, at your pace.",
  "Flat $3/mo Contributor membership — a fixed fee, never a percentage of your assets.",
  "17 tax-free expert portfolios; the causes above are your giving portfolio, growing tax-free until you give it away.",
];

export function DaffyFooter({ report }: { report: Report }) {
  const [shared, setShared] = useState(false);
  const [sharing, setSharing] = useState(false);

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    // If we're already on a shared page, reuse this URL; otherwise mint one.
    let url = window.location.href;
    try {
      if (!window.location.pathname.startsWith("/r/")) {
        const res = await fetch("/api/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ report }),
        });
        if (res.ok) {
          const { url: path } = (await res.json()) as { url: string };
          url = new URL(path, window.location.origin).toString();
        }
      }
      if (navigator.share) await navigator.share({ title: "My Charity Planner giving plan", url });
      else await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    } catch {
      /* user cancelled or share failed */
    } finally {
      setSharing(false);
    }
  };

  return (
    <footer className="mx-auto mt-24 max-w-3xl">
      <h2
        className="font-display leading-[1.1]"
        style={{ fontWeight: 380, fontSize: "clamp(2rem, 4vw, 3rem)" }}
      >
        Make it real on <em>Daffy</em>.
      </h2>
      <ul className="mt-8 space-y-4">
        {PITCH.map((line) => (
          <li key={line} className="flex gap-3 text-[var(--color-foreground)]">
            <span className="mt-2 inline-block size-1.5 shrink-0 rounded-full bg-[var(--color-daffy)]" />
            <span className="text-[17px] leading-relaxed">{line}</span>
          </li>
        ))}
      </ul>

      <a
        href="https://www.daffy.org/join"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-10 inline-flex items-center gap-2 rounded-[0.625rem] bg-[var(--color-daffy)] px-7 py-4 font-semibold text-[var(--color-background)] transition-transform hover:-translate-y-0.5"
      >
        Create your Daffy account →
      </a>

      <div className="mt-10 flex flex-wrap items-center gap-6 font-mono text-[12px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
        <button
          type="button"
          onClick={share}
          disabled={sharing}
          className="hover:text-[var(--color-foreground)] disabled:opacity-50"
        >
          {shared ? "✓ link copied" : sharing ? "creating link…" : "● share this plan"}
        </button>
        <span aria-hidden>·</span>
        <span>
          {report.meta.totalCorpus.toLocaleString()} charities researched · Claude Build Day
        </span>
      </div>
    </footer>
  );
}
