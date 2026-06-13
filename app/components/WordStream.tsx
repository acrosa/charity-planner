import { motion, useReducedMotion } from "motion/react";

// Streams text in word-by-word via a Motion stagger (DESIGN.md §2). Each word
// fades + rises 6px + un-blurs. Reduced motion → appears at once.
export function WordStream({
  text,
  className,
  gap = 0.035,
  as = "p",
}: {
  text: string;
  className?: string;
  gap?: number;
  as?: "p" | "h1" | "h2" | "span";
}) {
  const reduce = useReducedMotion();
  const words = text.split(/(\s+)/); // keep whitespace tokens
  const MotionTag = motion[as];

  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: gap } } }}
    >
      {words.map((w, i) =>
        w.trim() === "" ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: positional whitespace token
          <span key={i}>{w}</span>
        ) : (
          <motion.span
            // biome-ignore lint/suspicious/noArrayIndexKey: stable word position
            key={i}
            style={{ display: "inline-block", willChange: "transform, opacity, filter" }}
            variants={{
              hidden: { opacity: 0, y: 6, filter: "blur(4px)" },
              visible: {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                transition: { duration: 0.32, ease: "easeOut" },
              },
            }}
          >
            {w}
          </motion.span>
        ),
      )}
    </MotionTag>
  );
}
