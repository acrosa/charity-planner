import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

// A paper artifact (DESIGN.md §Paper artifacts). Flat saturated block, radius 1rem,
// fixed resting rotation, single contact shadow. Slides up 24px while rotation
// settles on scroll-into-view. Reduced motion → fade at final angle.
type Tone = "cream" | "white" | "butter" | "terracotta" | "receipt";

const TONE_CLASS: Record<Tone, string> = {
  cream: "bg-[var(--color-background)] text-[var(--color-foreground)]",
  white: "bg-white text-[var(--color-foreground)]",
  butter: "bg-[var(--color-butter)] text-[#1B1A17]",
  terracotta: "bg-[var(--color-terracotta)] text-[var(--color-background)]",
  receipt: "bg-[var(--color-receipt)] text-[var(--color-foreground)]",
};

export function PaperCard({
  tone = "cream",
  rotate = 0,
  delay = 0,
  className = "",
  children,
}: {
  tone?: Tone;
  rotate?: number; // resting rotation in degrees (-2.5..2.5)
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={`paper-shadow rounded-[1rem] p-7 sm:p-9 ${TONE_CLASS[tone]} ${className}`}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, rotate: 0 }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0, rotate }}
      viewport={{ once: true, margin: "-60px" }}
      transition={
        reduce ? { duration: 0.15 } : { type: "spring", stiffness: 260, damping: 26, delay }
      }
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}
