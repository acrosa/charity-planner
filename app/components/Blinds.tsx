import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

// Cream "blinds" wipe between stages (DESIGN.md §Animation). Horizontal bars in
// --background retract in sequence (~750ms), revealing the next stage already
// composed — a deliberate, premium stage curtain that reads as paper sliding
// away, not a shutter snapping. Reduced motion → 150ms crossfade, no bars.
const BAR_COUNT = 7;

// One tuned curtain feel: bars hold full, then peel back top→bottom with a soft
// anticipation curve. The cascade (stagger) does the work; each bar is unhurried.
// Last bar finishes near ~750ms: 0.46s ease + 6 * 0.048s stagger ≈ 0.75s.
const BAR_DURATION = 0.46;
const BAR_STAGGER = 0.048;
// A weighted ease-in-out: slow grip, quick release, gentle settle — paper, not
// a roller blind.
const BAR_EASE = [0.65, 0, 0.2, 1] as const;

export function Blinds({ show }: { show: boolean }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <AnimatePresence>
      {show && (
        <div className="pointer-events-none fixed inset-0 z-50 flex flex-col">
          {Array.from({ length: BAR_COUNT }).map((_, i) => (
            <motion.div
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed bar count
              key={i}
              className="flex-1 bg-[var(--color-background)]"
              initial={{ scaleY: 1 }}
              animate={{ scaleY: 1 }}
              exit={{ scaleY: 0 }}
              // Alternating origins so the bars peel like louvres meeting in the
              // middle — reads woven, not a single sheet dropping.
              style={{ originY: i % 2 === 0 ? 0 : 1 }}
              transition={{
                duration: BAR_DURATION,
                delay: i * BAR_STAGGER,
                ease: BAR_EASE,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Wraps a stage so it crossfades/wipes on key change. Use a changing `stageKey`
 * to trigger the transition between interview → loading → report.
 */
export function StageTransition({ stageKey, children }: { stageKey: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stageKey}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
        transition={
          reduce
            ? { duration: 0.15, ease: "easeOut" }
            : { duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }
        }
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
