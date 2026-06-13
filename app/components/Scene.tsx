import { motion, useReducedMotion } from "motion/react";
import { useMemo, useRef, useState } from "react";

// The continuous generative artwork (DESIGN.md §right-panel scene). One field,
// three modes: interview (rings + a motif that grows per captured facet),
// loading (a constellation that brightens as the pipeline thinks), and report
// (the final points settle into a quiet orbit). Dots are large and read clearly;
// the scene is always gently alive (rotating rings + floating dots) and reacts to
// the pointer. Reduced motion → a calm static final frame.
//
// Layout is deterministic (seeded) so SSR and client render identically.

const VIEW = 400;
const C = VIEW / 2;
const RING_COLOR = "#cdc6b2"; // --color-scene-ring (literal hex for SVG)
const POINT_COLOR = "#b8b09a"; // --color-scene-point
const SEED_COLOR = "#c7552b"; // terracotta
const HOVER_RADIUS = 95; // pointer influence radius in viewBox units

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

const DOT_STYLE = { transformBox: "fill-box", transformOrigin: "center" } as const;

export function Scene({
  mode,
  facetCount = 0,
  progress = 0,
  points = [],
  motifTints = [],
  className,
}: SceneProps) {
  const reduce = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  // Pointer position in viewBox coords (null when not hovering).
  const [ptr, setPtr] = useState<{ x: number; y: number } | null>(null);

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    if (reduce) return;
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    setPtr({
      x: ((e.clientX - r.left) / r.width) * VIEW,
      y: ((e.clientY - r.top) / r.height) * VIEW,
    });
  }

  // Proximity-driven scale boost for a dot at (x,y): up to +0.6 near the pointer.
  function hoverScale(x: number, y: number): number {
    if (!ptr) return 1;
    const d = Math.hypot(x - ptr.x, y - ptr.y);
    return d < HOVER_RADIUS ? 1 + (1 - d / HOVER_RADIUS) * 0.6 : 1;
  }

  // Faint background constellation, deterministic; larger + size-varied.
  const stars = useMemo(() => {
    const rnd = mulberry32(1337);
    return Array.from({ length: 78 }, () => {
      const angle = rnd() * Math.PI * 2;
      const radius = 36 + rnd() * 152;
      return {
        x: C + Math.cos(angle) * radius,
        y: C + Math.sin(angle) * radius,
        r: 2.5 + rnd() * 4.5,
        twinkle: 2 + rnd() * 3,
        delay: rnd() * 2,
      };
    });
  }, []);

  // Motif nodes for the interview (grow with facetCount), on a golden spiral.
  const motif = useMemo(() => {
    const rnd = mulberry32(7);
    return Array.from({ length: 12 }, (_, i) => {
      const a = i * 2.399963; // golden angle
      const radius = 26 + i * 11;
      return {
        x: C + Math.cos(a) * radius,
        y: C + Math.sin(a) * radius,
        r: 15 + rnd() * 6,
        floatX: (rnd() - 0.5) * 6,
        floatY: (rnd() - 0.5) * 6,
        dur: 3.5 + rnd() * 2.5,
        delay: rnd() * 2,
      };
    });
  }, []);

  const rings = [62, 104, 146, 184];
  const visibleMotif = Math.min(facetCount, motif.length);
  const brightCount = Math.round(progress * stars.length);

  // Report orbit: place final points evenly on a ring; floats per point.
  const orbit = useMemo(() => {
    const rnd = mulberry32(21);
    return points.map((hex, i) => {
      const a = (i / Math.max(points.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const radius = 128;
      return {
        x: C + Math.cos(a) * radius,
        y: C + Math.sin(a) * radius,
        hex,
        floatX: (rnd() - 0.5) * 7,
        floatY: (rnd() - 0.5) * 7,
        dur: 4 + rnd() * 2.5,
        delay: rnd() * 2,
      };
    });
  }, [points]);

  const spin = (dur: number, dir = 1) =>
    reduce
      ? {}
      : {
          animate: { rotate: 360 * dir },
          transition: { duration: dur, ease: "linear" as const, repeat: Number.POSITIVE_INFINITY },
          style: { originX: "200px", originY: "200px" },
        };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className={className}
      role="img"
      aria-label="Generative artwork representing your giving plan"
      style={{ width: "100%", height: "100%", overflow: "visible", touchAction: "none" }}
      onPointerMove={onMove}
      onPointerLeave={() => setPtr(null)}
    >
      <title>Charity Planner scene</title>

      {/* Concentric ripple rings — two groups counter-rotating for life. */}
      <motion.g {...spin(150, 1)}>
        {rings
          .filter((_, i) => i % 2 === 0)
          .map((r) => (
            <circle
              key={r}
              cx={C}
              cy={C}
              r={r}
              fill="none"
              stroke={RING_COLOR}
              strokeWidth={1.5}
              opacity={0.6}
            />
          ))}
      </motion.g>
      <motion.g {...spin(190, -1)}>
        {rings
          .filter((_, i) => i % 2 === 1)
          .map((r) => (
            <circle
              key={r}
              cx={C}
              cy={C}
              r={r}
              fill="none"
              stroke={RING_COLOR}
              strokeWidth={1}
              opacity={0.45}
              strokeDasharray="4 9"
            />
          ))}
      </motion.g>

      {/* Loading constellation — slow drift + brightening + twinkle = "thinking". */}
      {mode === "loading" && (
        <motion.g {...spin(220, 1)}>
          {stars.map((s, i) => {
            const bright = i < brightCount;
            return (
              <motion.circle
                // biome-ignore lint/suspicious/noArrayIndexKey: stable star index
                key={i}
                cx={s.x}
                cy={s.y}
                r={s.r}
                fill={POINT_COLOR}
                style={DOT_STYLE}
                initial={false}
                animate={
                  reduce
                    ? { opacity: bright ? 0.9 : 0.2 }
                    : {
                        opacity: bright ? [0.55, 1, 0.55] : [0.12, 0.28, 0.12],
                        scale: bright ? [1, 1.18, 1] : 1,
                      }
                }
                transition={
                  reduce
                    ? { duration: 0.4 }
                    : {
                        opacity: {
                          duration: s.twinkle,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "easeInOut",
                          delay: s.delay,
                        },
                        scale: {
                          duration: s.twinkle,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "easeInOut",
                          delay: s.delay,
                        },
                      }
                }
              />
            );
          })}
        </motion.g>
      )}

      {/* Interview motif — central seed + a node per captured facet. */}
      {mode === "interview" && (
        <>
          <motion.circle
            cx={C}
            cy={C}
            r={12}
            fill={SEED_COLOR}
            style={DOT_STYLE}
            animate={reduce ? { scale: 1 } : { scale: [1, 1.12, 1] }}
            transition={
              reduce ? {} : { duration: 3.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
            }
          />
          {motif.slice(0, visibleMotif).map((m, i) => (
            <motion.circle
              // biome-ignore lint/suspicious/noArrayIndexKey: stable motif index
              key={i}
              cx={m.x}
              cy={m.y}
              r={m.r}
              fill={motifTints[i] ?? "#f5b81f"}
              style={DOT_STYLE}
              initial={reduce ? false : { scale: 0, opacity: 0 }}
              animate={{
                opacity: 1,
                scale: hoverScale(m.x, m.y),
                x: reduce ? 0 : [0, m.floatX, 0],
                y: reduce ? 0 : [0, m.floatY, 0],
              }}
              transition={{
                opacity: { duration: 0.4 },
                scale: { type: "spring", stiffness: 300, damping: 22 },
                x: reduce
                  ? {}
                  : {
                      duration: m.dur,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                      delay: m.delay,
                    },
                y: reduce
                  ? {}
                  : {
                      duration: m.dur * 1.3,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                      delay: m.delay,
                    },
              }}
            />
          ))}
        </>
      )}

      {/* Report orbit — final points settle and float gently. */}
      {mode === "report" &&
        orbit.map((p, i) => (
          <motion.circle
            // biome-ignore lint/suspicious/noArrayIndexKey: stable orbit index
            key={i}
            cx={p.x}
            cy={p.y}
            r={18}
            fill={p.hex}
            style={DOT_STYLE}
            initial={reduce ? false : { scale: 0, opacity: 0 }}
            animate={{
              opacity: 1,
              scale: hoverScale(p.x, p.y),
              x: reduce ? 0 : [0, p.floatX, 0],
              y: reduce ? 0 : [0, p.floatY, 0],
            }}
            transition={{
              opacity: { duration: 0.4, delay: i * 0.05 },
              scale: { type: "spring", stiffness: 260, damping: 24, delay: reduce ? 0 : i * 0.05 },
              x: reduce
                ? {}
                : {
                    duration: p.dur,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                    delay: p.delay,
                  },
              y: reduce
                ? {}
                : {
                    duration: p.dur * 1.3,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                    delay: p.delay,
                  },
            }}
          />
        ))}
    </svg>
  );
}
