import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

// Cream "blinds" wipe between stages (DESIGN.md §Animation). Horizontal bars in
// --background retract in sequence (~750ms), revealing the next stage already
// composed. Reduced motion → 150ms crossfade, no bars.
const BAR_COUNT = 7;

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
              style={{ originY: i % 2 === 0 ? 0 : 1 }}
              transition={{ duration: 0.55, delay: i * 0.045, ease: [0.7, 0, 0.3, 1] }}
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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0.15 : 0.4, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
