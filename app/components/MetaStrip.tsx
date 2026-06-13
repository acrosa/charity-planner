import { useState } from "react";
import { Link } from "react-router";

// Sticky meta strip (DESIGN.md §Layout). One mono line on the grid: wordmark left
// (links home), location center, stage right. No border — space separates it. The
// voice control lives inside the interview now (next to Send), so the strip keeps
// only a tiny non-interactive status dot.
export interface MetaStripProps {
  location: string;
  onLocationChange?: (loc: string) => void;
  stageLabel: string; // e.g. "INTERVIEW (2/3)" or "YOUR REPORT"
  voiceOn: boolean;
}

export function MetaStrip({ location, onLocationChange, stageLabel, voiceOn }: MetaStripProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(location);

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft !== location) onLocationChange?.(draft.trim());
  };

  return (
    <header className="sticky top-0 z-30 bg-[var(--color-background)] px-[clamp(24px,5vw,96px)] pt-6 pb-2">
      <div className="flex items-center justify-between gap-4 font-mono text-[12px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
        <Link to="/" className="text-[var(--color-foreground)] transition-opacity hover:opacity-70">
          charity planner
        </Link>
        <span className="hidden items-center gap-3 sm:flex">
          {editing ? (
            <input
              // biome-ignore lint/a11y/noAutofocus: intentional inline edit affordance
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => e.key === "Enter" && commit()}
              className="w-40 border-b border-[var(--color-hairline)] bg-transparent text-center uppercase tracking-[0.08em] outline-none focus:border-[var(--color-foreground)]"
              aria-label="Edit location"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(location);
                setEditing(true);
              }}
              className="cursor-pointer uppercase tracking-[0.08em] hover:text-[var(--color-foreground)]"
            >
              {location || "set location"}
            </button>
          )}
        </span>
        <span className="flex items-center gap-3">
          <span className="hidden md:inline">{stageLabel}</span>
          {/* Tiny non-interactive status dot — the toggle itself lives in the interview. */}
          <span
            aria-hidden
            className={`inline-block size-2 rounded-full transition-colors ${
              voiceOn ? "animate-pulse bg-[var(--color-terracotta)]" : "bg-[var(--color-muted)]/50"
            }`}
          />
        </span>
      </div>
    </header>
  );
}
