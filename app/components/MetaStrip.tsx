import { useState } from "react";

// Sticky meta strip (DESIGN.md §Layout). One mono line on the grid: wordmark left,
// location/time center, stage + voice toggle right. No border — space separates it.
export interface MetaStripProps {
  location: string;
  onLocationChange?: (loc: string) => void;
  stageLabel: string; // e.g. "INTERVIEW (2/3)" or "YOUR REPORT"
  voiceOn: boolean;
  onToggleVoice: () => void;
  time?: string;
}

export function MetaStrip({
  location,
  onLocationChange,
  stageLabel,
  voiceOn,
  onToggleVoice,
  time,
}: MetaStripProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(location);

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft !== location) onLocationChange?.(draft.trim());
  };

  return (
    <header className="sticky top-0 z-30 bg-[var(--color-background)] px-[clamp(24px,5vw,96px)] pt-6 pb-2">
      <div className="flex items-center justify-between gap-4 font-mono text-[12px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
        <span className="text-[var(--color-foreground)]">charity planner</span>
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
          {time && <span aria-hidden>· {time}</span>}
        </span>
        <span className="flex items-center gap-4">
          <span className="hidden md:inline">{stageLabel}</span>
          <button
            type="button"
            onClick={onToggleVoice}
            aria-pressed={voiceOn}
            className="flex items-center gap-1.5 uppercase tracking-[0.08em] transition-colors hover:text-[var(--color-foreground)]"
          >
            <span
              className={`inline-block size-2 rounded-full transition-colors ${
                voiceOn ? "animate-pulse bg-[var(--color-terracotta)]" : "bg-[var(--color-muted)]"
              }`}
            />
            voice
          </button>
        </span>
      </div>
    </header>
  );
}
