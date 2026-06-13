import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";

// The continuous generative artwork (DESIGN.md §right-panel scene). One field,
// three modes: interview (rings + a motif that grows per captured facet),
// loading (constellation of faint points brightening as stages complete), and
// report (the final points settle into a quiet orbit). Dots read at vignette
// scale; rotation is slow and continuous. Reduced motion → a static final frame.
//
// Layout is deterministic (seeded) so SSR and client render identically.

const VIEW = 400;
const C = VIEW / 2;
const RING_COLOR = "#cdc6b2"; // --color-scene-ring (literal hex for SVG)
const POINT_COLOR = "#b8b09a"; // --color-scene-point

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type SceneMode = "interview" | "loading" | "report";

export interface SceneProps {
  mode: SceneMode;
  /** interview: number of captured facets (motif grows). */
  facetCount?: number;
  /** loading: 0..1 pipeline progress. */
  progress?: number;
  /** report: literal hex tints for the final orbital points. */
  points?: string[];
  /** tints to color the growing motif nodes (interview). */
  motifTints?: string[];
  className?: string;
}

export function Scene({
  mode,
  facetCount = 0,
  progress = 0,
  points = [],
  motifTints = [],
  className,
}: SceneProps) {
  const reduce = useReducedMotion();

  // A faint background constellation, deterministic.
  const stars = useMemo(() => {
    const rnd = mulberry32(1337);
    return Array.from({ length: 90 }, () => {
      const angle = rnd() * Math.PI * 2;
      const radius = 40 + rnd() * 150;
      return {
        x: C + Math.cos(angle) * radius,
        y: C + Math.sin(angle) * radius,
        r: 1.5 + rnd() * 2,
        bright: rnd(),
      };
    });
  }, []);

  // Motif nodes for the interview (grow with facetCount), arranged on a spiral.
  const motif = useMemo(() => {
    const rnd = mulberry32(7);
    return Array.from({ length: 12 }, (_, i) => {
      const a = i * 2.399963; // golden angle
      const radius = 14 + i * 9;
      return {
        x: C + Math.cos(a) * radius,
        y: C + Math.sin(a) * radius,
        r: 7 + rnd() * 3,
      };
    });
  }, []);

  const rings = [60, 100, 140, 178];
  const visibleMotif = Math.min(facetCount, motif.length);
  const brightCount = Math.round(progress * stars.length);

  // Report orbit: place final points evenly on a ring.
  const orbit = useMemo(() => {
    return points.map((hex, i) => {
      const a = (i / Math.max(points.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const radius = 120;
      return { x: C + Math.cos(a) * radius, y: C + Math.sin(a) * radius, hex };
    });
  }, [points]);

  const rotation = reduce ? {} : { rotate: 360 };
  const rotationTransition = {
    duration: 120,
    ease: "linear" as const,
    repeat: Number.POSITIVE_INFINITY,
  };

  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className={className}
      role="img"
      aria-label="Generative artwork representing your giving plan"
      style={{ width: "100%", height: "100%", overflow: "visible" }}
    >
      <title>Charity Planner scene</title>
      {/* Concentric ripple rings, slowly rotating */}
      <motion.g
        animate={rotation}
        transition={rotationTransition}
        style={{ originX: "200px", originY: "200px" }}
      >
        {rings.map((r, i) => (
          <circle
            key={r}
            cx={C}
            cy={C}
            r={r}
            fill="none"
            stroke={RING_COLOR}
            strokeWidth={i === 0 ? 1.5 : 1}
            opacity={0.7 - i * 0.12}
            strokeDasharray={i % 2 === 0 ? undefined : "4 8"}
          />
        ))}
      </motion.g>

      {mode === "loading" &&
        stars.map((s, i) => (
          <motion.circle
            // biome-ignore lint/suspicious/noArrayIndexKey: stable star index
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            initial={false}
            animate={{ opacity: i < brightCount ? 0.9 : 0.18 }}
            transition={{ duration: 0.6 }}
            fill={POINT_COLOR}
          />
        ))}

      {mode === "interview" && (
        <>
          {/* central seed */}
          <circle cx={C} cy={C} r={7} fill="#c7552b" />
          {motif.slice(0, visibleMotif).map((m, i) => (
            <motion.circle
              // biome-ignore lint/suspicious/noArrayIndexKey: stable motif index
              key={i}
              cx={m.x}
              cy={m.y}
              r={m.r}
              initial={reduce ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              style={{ originX: `${m.x}px`, originY: `${m.y}px` }}
              fill={motifTints[i] ?? "#f5b81f"}
            />
          ))}
        </>
      )}

      {mode === "report" &&
        orbit.map((p, i) => (
          <motion.circle
            // biome-ignore lint/suspicious/noArrayIndexKey: stable orbit index
            key={i}
            cx={p.x}
            cy={p.y}
            r={13}
            initial={reduce ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 26, delay: i * 0.05 }}
            style={{ originX: `${p.x}px`, originY: `${p.y}px` }}
            fill={p.hex}
          />
        ))}
    </svg>
  );
}
