import { motion, useReducedMotion } from "motion/react";
import { Scene, type SceneMode } from "./Scene";

// A small pinned-print scene study on the landing (DESIGN.md §1). Live canvas +
// mono lowercase caption. Deliberately varied sizes/offsets; fades + rises on
// scroll-in, once.
export function Vignette({
  mode,
  caption,
  size = 320,
  facetCount,
  points,
  className = "",
}: {
  mode: SceneMode;
  caption: string;
  size?: number;
  facetCount?: number;
  points?: string[];
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.figure
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6 }}
    >
      <div style={{ width: size, height: size, maxWidth: "100%" }}>
        <Scene mode={mode} facetCount={facetCount} points={points} progress={0.7} />
      </div>
      <figcaption className="mt-2 font-mono text-[12px] lowercase tracking-[0.04em] text-[var(--color-muted)]">
        <span className="text-[var(--color-terracotta)]">●</span> {caption}
      </figcaption>
    </motion.figure>
  );
}
