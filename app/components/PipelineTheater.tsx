import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Scene } from "./Scene";

// Loading = pipeline theater (DESIGN.md §4). Left cycles stage captions in mono
// (crossfade ~3.8s so it reads calm) over an animated progress rail; the headline
// breathes; the right runs the brightening constellation. No spinner, ever — the
// whole screen reads as live computation.
const STAGES = [
  "READING YOUR PHILOSOPHY",
  "SEARCHING THOUSANDS OF CHARITIES",
  "CHECKING WHAT THEY'RE DOING NOW",
  "WRITING YOUR STRATEGY",
];

export function PipelineTheater({ corpusCount }: { corpusCount?: number }) {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 3800);
    return () => clearInterval(id);
  }, []);

  const caption =
    stage === 1 && corpusCount
      ? `SEARCHING ${corpusCount.toLocaleString()} CHARITIES`
      : STAGES[stage];
  const progress = (stage + 1) / STAGES.length;

  return (
    <div className="grid min-h-[70vh] grid-cols-1 items-center gap-8 px-[clamp(24px,5vw,96px)] lg:grid-cols-12">
      <div className="lg:col-span-5">
        {/* Stage caption — crossfades, calm */}
        <AnimatePresence mode="wait">
          <motion.p
            key={caption}
            className="font-mono text-[14px] uppercase tracking-[0.12em] text-[var(--color-muted)]"
            initial={{ opacity: 0, y: reduce ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -6 }}
            transition={{ duration: reduce ? 0.15 : 0.7 }}
          >
            {caption}
          </motion.p>
        </AnimatePresence>

        {/* Animated progress rail — advances as stages complete */}
        <div className="mt-5 h-px w-full max-w-sm overflow-hidden bg-[var(--color-hairline)]">
          <motion.div
            className="h-full bg-[var(--color-terracotta)]"
            initial={false}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: reduce ? 0.15 : 1.4, ease: "easeInOut" }}
            style={{ originX: 0 }}
          />
        </div>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
          step {stage + 1} / {STAGES.length}
        </p>

        {/* Breathing headline with an animated ellipsis */}
        <motion.p
          className="mt-8 font-display text-3xl"
          style={{ fontWeight: 380 }}
          animate={reduce ? { opacity: 1 } : { opacity: [0.55, 1, 0.55] }}
          transition={
            reduce ? {} : { duration: 2.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
          }
        >
          Building your strategy
          {!reduce && (
            <motion.span
              aria-hidden
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{
                duration: 1.6,
                repeat: Number.POSITIVE_INFINITY,
                times: [0, 0.2, 0.8, 1],
              }}
            >
              …
            </motion.span>
          )}
        </motion.p>
      </div>

      <div className="mx-auto aspect-square w-full max-w-[560px] lg:col-span-6 lg:col-start-7">
        <Scene mode="loading" progress={progress} />
      </div>
    </div>
  );
}
