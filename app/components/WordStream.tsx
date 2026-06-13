import { motion, useReducedMotion } from "motion/react";

// Streams text in word-by-word via a Motion stagger (DESIGN.md §2). Each word
// fades + rises 6px + un-blurs. Reduced motion → appears at once.
export function WordStream({
  text,
  className,
  style,
  gap = 0.035,
  as = "p",
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  gap?: number;
  as?: "p" | "h1" | "h2" | "span";
}) {
  const reduce = useReducedMotion();
  const words = text.split(/(\s+)/); // keep whitespace tokens
  const MotionTag = motion[as];

  if (reduce) {
    const Tag = as;
    return (
      <Tag className={className} style={style}>
        {text}
      </Tag>
    );
  }

  return (
    <MotionTag
      className={className}
      style={style}
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
              hidden: { opacity: 0, y: 12, filter: "blur(6px)" },
              visible: {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                transition: { duration: 0.38, ease: "easeOut" },
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
