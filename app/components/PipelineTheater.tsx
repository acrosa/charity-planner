import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Scene } from "./Scene";

// Loading = pipeline theater (DESIGN.md §4). Left cycles stage captions in mono
// (crossfade ~3.8s so it reads calm). Right runs the constellation. No spinner.
const STAGES = [
  "READING YOUR PHILOSOPHY",
  "SEARCHING THOUSANDS OF CHARITIES",
  "CHECKING WHAT THEY'RE DOING NOW",
  "WRITING YOUR STRATEGY",
];

export function PipelineTheater({ corpusCount }: { corpusCount?: number }) {
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

  return (
    <div className="grid min-h-[70vh] grid-cols-1 items-center gap-8 px-[clamp(24px,5vw,96px)] lg:grid-cols-12">
      <div className="lg:col-span-5">
        <AnimatePresence mode="wait">
          <motion.p
            key={caption}
            className="font-mono text-[14px] uppercase tracking-[0.12em] text-[var(--color-muted)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            {caption}
          </motion.p>
        </AnimatePresence>
        <p className="mt-6 font-display text-2xl" style={{ fontWeight: 380 }}>
          Building your strategy…
        </p>
      </div>
      <div className="mx-auto aspect-square w-full max-w-[520px] lg:col-span-6 lg:col-start-7">
        <Scene mode="loading" progress={(stage + 1) / STAGES.length} />
      </div>
    </div>
  );
}
