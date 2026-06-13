// Visual primitives for the /how-it-was-made scrapbook page.
//
// Everything here obeys DESIGN.md: ink on cream, paper artifacts (flat saturated
// blocks + the single contact shadow + a fixed resting rotation), type does the
// work, color is a deliberate accent. Hand-drawn doodles are inline SVG in
// `currentColor` so they invert correctly on terracotta papers. SVG fills that
// need a cause tint use the literal hex from causeColor.ts, never a CSS var.

import {
  animate,
  type MotionStyle,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";

// "white" is a plain paper card — pure white so it reads as a distinct sheet on
// the cream field instead of blending into it. (Not a design token; intentional
// for this page's legibility, kept local so we don't touch the shared app.css.)
export type Tone = "white" | "butter" | "terracotta" | "receipt";

const TONE_CLASS: Record<Tone, string> = {
  white: "bg-white text-foreground",
  butter: "bg-butter text-foreground",
  terracotta: "bg-terracotta text-background",
  receipt: "bg-receipt text-foreground",
};

const SPRING = { type: "spring", stiffness: 260, damping: 26 } as const;

// ── Paper artifact ──────────────────────────────────────────────────────────
// A piece of paper laid on the desk: flat tone, contact shadow, a fixed resting
// rotation that springs in on scroll-into-view. Reduced motion → final angle, no
// travel.
export function Paper({
  tone = "white",
  rotate = 0,
  className = "",
  children,
}: {
  tone?: Tone;
  rotate?: number;
  className?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24, rotate: 0 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0, rotate }}
      viewport={{ once: true, margin: "-8% 0px -12% 0px" }}
      transition={SPRING}
      style={reduce ? ({ rotate } as MotionStyle) : undefined}
      className={`paper-shadow relative rounded-paper ${TONE_CLASS[tone]} ${className}`}
    >
      {children}
    </motion.div>
  );
}

// ── Dashed rank/seal stamp ────────────────────────────────────────────────────
// The small dashed-border stamp holding a number (`Nº 03`). One stationery
// flourish per paper, never crowding the content.
export function Stamp({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-[6px] border border-current/35 border-dashed px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${className}`}
      style={{ borderStyle: "dashed" }}
    >
      {label}
    </span>
  );
}

// A circular dashed seal — `REPORT · NO. 0042` energy, for headers.
export function Seal({ children }: { children: ReactNode }) {
  return (
    <span className="grid size-[68px] place-items-center rounded-full border border-current/35 border-dashed text-center font-mono text-[9px] uppercase leading-[1.3] tracking-[0.1em]">
      {children}
    </span>
  );
}

// ── Hand-drawn margin note (Caveat) ───────────────────────────────────────────
export function MarginNote({
  children,
  rotate = -3,
  className = "",
}: {
  children: ReactNode;
  rotate?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.p
      initial={reduce ? false : { opacity: 0, rotate: 0 }}
      whileInView={reduce ? undefined : { opacity: 1, rotate }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.4 }}
      style={reduce ? { rotate } : undefined}
      className={`font-hand text-[1.5rem] leading-[1.2] text-muted ${className}`}
    >
      {children}
    </motion.p>
  );
}

// ── Hand-drawn doodles ────────────────────────────────────────────────────────
type DoodleName =
  | "pin"
  | "coffee"
  | "meter"
  | "music"
  | "spark"
  | "eye"
  | "file"
  | "scissors"
  | "arrow"
  | "heart";

const DOODLE_PATHS: Record<DoodleName, ReactNode> = {
  pin: (
    <>
      <path d="M12 21c3.8-4.7 6.6-7.7 6.6-11.3a6.6 6.6 0 1 0-13.2 0C5.4 13.3 8.2 16.3 12 21Z" />
      <circle cx="12" cy="9.4" r="2.4" />
    </>
  ),
  coffee: (
    <>
      <path d="M5 9.5h11.2v4.6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z" />
      <path d="M16.2 10.6h1.9a2.1 2.1 0 0 1 0 4.2h-1.1" />
      <path d="M8 3.4c-.6 1 .6 2 0 3M11 3.4c-.6 1 .6 2 0 3" />
    </>
  ),
  meter: (
    <>
      <circle cx="12" cy="7" r="4.6" />
      <path d="M10 6.6h4M12 11.6v6.4M9.2 20h5.6" />
    </>
  ),
  music: (
    <>
      <path d="M9 17.5V5.2l9-2v9.6" />
      <circle cx="6.8" cy="17.6" r="2.4" />
      <circle cx="15.8" cy="14.9" r="2.4" />
    </>
  ),
  spark: (
    <path d="M12 3v6M12 15v6M3 12h6M15 12h6M6.5 6.5l3 3M14.5 14.5l3 3M17.5 6.5l-3 3M9.5 14.5l-3 3" />
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  file: (
    <>
      <path d="M7 3.2h6.6L18 7.6v13.2H7Z" />
      <path d="M13.4 3.2v4.6H18" />
      <path d="M9.4 12h6M9.4 15.2h6M9.4 18.4h3.6" />
    </>
  ),
  scissors: (
    <>
      <circle cx="6.5" cy="6.5" r="2.6" />
      <circle cx="6.5" cy="17.5" r="2.6" />
      <path d="M8.7 8.4 20 16M8.7 15.6 20 8" />
    </>
  ),
  arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
  heart: (
    <path d="M12 20s-7-4.4-7-9.4A3.6 3.6 0 0 1 12 7.6 3.6 3.6 0 0 1 19 10.6c0 5-7 9.4-7 9.4Z" />
  ),
};

export function Doodle({
  name,
  size = 24,
  className = "",
  strokeWidth = 1.6,
}: {
  name: DoodleName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {DOODLE_PATHS[name]}
    </svg>
  );
}

// A checkmark that draws itself in when scrolled into view.
export function DrawnCheck({ size = 20, delay = 0 }: { size?: number; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <motion.path
        d="M4 12.5 9.5 18 20 6.5"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        whileInView={reduce ? undefined : { pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay }}
      />
    </svg>
  );
}

// ── The timeline thread ───────────────────────────────────────────────────────
// A dashed ink stitch that draws downward as you scroll the timeline. It reads as
// a hand-drawn thread (not a panel divider): low opacity, dashed, with nodes.
export function Thread({ targetRef }: { targetRef: React.RefObject<HTMLElement | null> }) {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start 0.2", "end 0.85"],
  });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 w-px" aria-hidden="true">
      <motion.div
        className="h-full w-px origin-top border-foreground/25 border-l border-dashed"
        style={reduce ? undefined : { scaleY }}
      />
    </div>
  );
}

// A node dot on the thread, tinted by cause where it carries meaning.
export function Node({ color = "#1b1a17" }: { color?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="block size-[13px] rounded-full ring-4 ring-background"
      style={{ backgroundColor: color }}
      initial={reduce ? false : { scale: 0 }}
      whileInView={reduce ? undefined : { scale: 1 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ type: "spring", stiffness: 320, damping: 18 }}
    />
  );
}

// ── Terminal window ───────────────────────────────────────────────────────────
// A small mac-style terminal: ink panel, cream text, paper-tone traffic lights
// (never the literal red/amber/green — green is reserved for Daffy).
export function Terminal({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-input bg-foreground text-background ${className}`}>
      <div className="flex items-center gap-2 px-4 py-2.5">
        <span className="size-[10px] rounded-full bg-terracotta" />
        <span className="size-[10px] rounded-full bg-butter" />
        <span className="size-[10px] rounded-full bg-receipt" />
        <span className="ml-2 font-mono text-[11px] text-background/55 tracking-[0.04em]">
          {title}
        </span>
      </div>
      <div className="px-4 pb-4 font-mono text-[12.5px] leading-[1.7]">{children}</div>
    </div>
  );
}

// A terminal prompt line — terracotta caret, not a green one.
export function Prompt({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="select-none text-terracotta">❯</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

// ── Count-up ──────────────────────────────────────────────────────────────────
// Counts from `from` to `to` once in view. Reduced motion → lands on `to`.
export function CountUp({
  from,
  to,
  duration = 1.6,
  className = "",
}: {
  from: number;
  to: number;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const [value, setValue] = useState(reduce ? to : from);

  useEffect(() => {
    if (reduce || !inView) return;
    const controls = animate(from, to, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, from, to, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {value.toLocaleString("en-US")}
    </span>
  );
}

// A thin progress bar that fills to `pct` (0–100) when in view.
export function ProgressBar({ pct, color = "#1b1a17" }: { pct: number; color?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="h-[5px] w-full overflow-hidden rounded-full bg-foreground/10">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color, width: reduce ? `${pct}%` : undefined }}
        initial={reduce ? false : { width: 0 }}
        whileInView={reduce ? undefined : { width: `${pct}%` }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ duration: 1.4, ease: "easeOut" }}
      />
    </div>
  );
}

// ── Equalizer bars (for the now-playing music chip) ───────────────────────────
export function Equalizer() {
  const reduce = useReducedMotion();
  const bars = [0.5, 0.9, 0.35, 0.7, 0.55];
  return (
    <span className="flex h-5 items-end gap-[3px]" aria-hidden="true">
      {bars.map((seed, i) => (
        <motion.span
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length decorative bars
          key={i}
          className="w-[3px] rounded-full bg-current"
          style={{ height: `${seed * 100}%` }}
          animate={reduce ? undefined : { scaleY: [seed, 1, 0.3, 0.8, seed] }}
          transition={{
            duration: 1.1 + i * 0.18,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

// ── Inline map frame ──────────────────────────────────────────────────────────
// A keyless OpenStreetMap embed, toned toward ink-on-cream and pinned. Loads
// lazily; if it never loads the framed caption still reads as a map card.
export function MapFrame({ bbox, caption }: { bbox: string; caption: string }) {
  // The bbox is centered on the location, so the viewport center is the spot —
  // we draw our own on-brand pin there (no OSM `marker`, which would duplicate it
  // with an off-palette orange teardrop).
  return (
    <div className="relative overflow-hidden rounded-input border border-foreground/15">
      <iframe
        title="map — Shack15, Ferry Building"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="block h-[210px] w-full"
        style={{ filter: "grayscale(1) sepia(0.42) contrast(0.92) brightness(1.04)", border: 0 }}
      />
      {/* Pin's tip sits at the viewport center = the location. */}
      <span className="-translate-x-1/2 -translate-y-full pointer-events-none absolute top-1/2 left-1/2 text-terracotta">
        <Doodle name="pin" size={30} strokeWidth={1.8} />
      </span>
      <span className="absolute top-2 left-2 rounded-[6px] bg-background/85 px-2 py-1 font-mono text-[10px] text-muted uppercase tracking-[0.1em]">
        {caption}
      </span>
    </div>
  );
}

// A horizontal cause-tinted rule — the only color accent on an entry.
export function CauseRule({ color, width = 48 }: { color: string; width?: number }) {
  return <span className="block h-[3px] rounded-full" style={{ backgroundColor: color, width }} />;
}
