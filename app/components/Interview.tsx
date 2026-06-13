import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { causeColor } from "~/lib/causeColor";
import { annotationKey, causeBucketTints, type FacetAnnotation, type Facets } from "~/lib/facets";
import { useVoice } from "~/lib/useVoice";
import { DrawnCheck } from "~/scrapbook/primitives";
import { Scene } from "./Scene";
import { WordStream } from "./WordStream";

type Msg = { role: "agent" | "user"; text: string };

interface TurnResponse {
  facets: Facets;
  nextQuestion: string | null;
  done: boolean;
  stage: string;
  newAnnotations: FacetAnnotation[];
}

const GLYPH_CHAR: Record<FacetAnnotation["glyph"], string> = {
  pin: "📍",
  heart: "♥",
  dollar: "$",
  cross: "✕",
  star: "✦",
};

// Small resting rotations so the captured-facet cards read as a scrapbook stack.
const FACET_ROTATE = [-1.6, 1.4, -1, 1.8, -1.4, 1.2];

// Mic glyph for the voice toggle — solid when on, hairline-stroke when off.
function MicGlyph({ on }: { on: boolean }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill={on ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" fill="none" />
      <path d="M12 17.5V21M9 21h6" fill="none" />
    </svg>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex gap-1" role="status" aria-label="thinking">
      {[0, 1, 2].map((i) => (
        <motion.span
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed 3-dot array
          key={i}
          className="inline-block size-2 rounded-full bg-[var(--color-muted)]"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, delay: i * 0.2 }}
        />
      ))}
    </span>
  );
}

export function Interview({
  mode,
  voiceOn = false,
  onToggleVoice,
  onStageChange,
  onComplete,
}: {
  mode: "quick" | "full";
  voiceOn?: boolean;
  onToggleVoice?: () => void;
  onStageChange?: (stage: string, userTurns: number) => void;
  onComplete: (facets: Facets) => void;
}) {
  const reduce = useReducedMotion();
  const [history, setHistory] = useState<Msg[]>([]);
  const [facets, setFacets] = useState<Facets | undefined>(undefined);
  const [question, setQuestion] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<FacetAnnotation[]>([]);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const voice = useVoice();
  const voicedRef = useRef<string | null>(null);

  async function callTurn(nextHistory: Msg[], currentFacets: Facets | undefined) {
    setThinking(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, history: nextHistory, facets: currentFacets }),
      });
      const data = (await res.json()) as TurnResponse;
      setThinking(false);
      setFacets(data.facets);
      if (data.newAnnotations.length) {
        setAnnotations((prev) => {
          const seen = new Set(prev.map(annotationKey));
          return [...prev, ...data.newAnnotations.filter((a) => !seen.has(annotationKey(a)))];
        });
      }
      onStageChange?.(data.stage, nextHistory.filter((m) => m.role === "user").length);
      if (data.done) {
        // brief beat so the last annotation lands before transitioning
        setTimeout(() => onComplete(data.facets), reduce ? 200 : 900);
      } else if (data.nextQuestion) {
        setQuestion(data.nextQuestion);
        setHistory([...nextHistory, { role: "agent", text: data.nextQuestion }]);
      }
    } catch {
      setThinking(false);
      setQuestion("Sorry — something hiccuped. Could you try that again?");
    }
  }

  // Kick off the opening question (once, on mount).
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs once
  useEffect(() => {
    if (started) return;
    setStarted(true);
    callTurn([], undefined);
  }, [started]);

  // After the opener loads, record it in history once.
  useEffect(() => {
    if (question && history.length === 0) {
      setHistory([{ role: "agent", text: question }]);
    }
  }, [question, history.length]);

  const submitText = (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;
    setInput("");
    const next: Msg[] = [...history, { role: "user", text }];
    setHistory(next);
    callTurn(next, facets);
  };

  const submit = () => submitText(input);

  // Voice turn: when a new question is showing and voice is on, speak it, then
  // auto-listen (silence-VAD) and submit the transcript. Hands-free.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on question/voiceOn
  useEffect(() => {
    if (!voiceOn || !question || thinking) return;
    if (voicedRef.current === question) return;
    voicedRef.current = question;
    let aborted = false;
    voice.reset();
    (async () => {
      await voice.speak(question);
      if (aborted) return;
      const transcript = await voice.listen();
      if (!aborted && transcript.trim()) submitText(transcript);
    })();
    return () => {
      aborted = true;
      voice.cancel();
    };
  }, [voiceOn, question, thinking]);

  // Turning voice off mid-turn stops any playback/recording immediately.
  // biome-ignore lint/correctness/useExhaustiveDependencies: react to voiceOn only
  useEffect(() => {
    if (!voiceOn) voice.cancel();
  }, [voiceOn]);

  const facetCount = facets ? countFacets(facets) : 0;
  const tints = facets ? causeBucketTints(facets).map((b) => causeColor(b)) : [];

  return (
    <div className="grid grid-cols-1 gap-10 px-[clamp(24px,5vw,96px)] pt-8 lg:grid-cols-12">
      {/* Conversation — cols 1–6 */}
      <div className="lg:col-span-6">
        <div className="min-h-[40vh]">
          <AnimatePresence mode="wait">
            {thinking && !question ? (
              <motion.div key="thinking" exit={{ opacity: 0 }}>
                <ThinkingDots />
              </motion.div>
            ) : question ? (
              <motion.div
                key={question}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(6px)", y: -14 }}
                transition={{ duration: reduce ? 0.15 : 0.42, ease: "easeOut" }}
              >
                <WordStream
                  text={question}
                  as="h2"
                  // The focal display element of the interview.
                  className="font-display lowercase leading-[1.2] text-[clamp(1.9rem,3.4vw,2.9rem)]"
                  style={{ fontWeight: 380 }}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Input with breathing underline */}
          <div className="mt-8">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={2}
              placeholder={thinking ? "" : "Type your answer…"}
              disabled={thinking}
              className={`w-full resize-none border-b bg-transparent pb-2 text-2xl outline-none transition-colors placeholder:text-2xl placeholder:text-[var(--color-muted)]/60 ${
                thinking
                  ? "animate-pulse border-[var(--color-hairline)]"
                  : "border-[var(--color-foreground)]/40 focus:border-b-2 focus:border-[var(--color-foreground)]"
              }`}
              aria-label="Your answer"
            />
            <div className="mt-4 flex items-center gap-4">
              <button
                type="button"
                onClick={submit}
                disabled={thinking || !input.trim()}
                className="font-mono text-[13px] uppercase tracking-[0.08em] text-[var(--color-foreground)] disabled:opacity-30"
              >
                {thinking ? <ThinkingDots /> : "send →"}
              </button>

              {/* Prominent voice on/off toggle — pill beside Send. Typed input
                  always stays available; this just enables hands-free turns. */}
              {onToggleVoice && (
                <motion.button
                  type="button"
                  onClick={onToggleVoice}
                  aria-pressed={voiceOn}
                  aria-label={voiceOn ? "Turn voice off" : "Turn voice on"}
                  className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-[12px] uppercase tracking-[0.08em] transition-colors ${
                    voiceOn
                      ? "bg-[var(--color-terracotta)] text-[var(--color-background)]"
                      : "border border-[var(--color-foreground)]/40 text-[var(--color-foreground)] hover:border-[var(--color-foreground)]"
                  }`}
                  animate={voiceOn && !reduce ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                  transition={
                    voiceOn && !reduce
                      ? { duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
                      : { duration: 0.2 }
                  }
                >
                  <MicGlyph on={voiceOn} />
                  voice
                </motion.button>
              )}

              {/* Voice state — speaking / listening (tap to send) / transcribing */}
              {voiceOn && voice.state !== "idle" && (
                <motion.button
                  type="button"
                  onClick={() => voice.sendNow()}
                  disabled={voice.state !== "listening"}
                  className="flex items-center gap-2 rounded-full bg-[var(--color-terracotta)] px-4 py-1.5 font-mono text-[12px] uppercase tracking-[0.08em] text-[var(--color-background)] disabled:opacity-70"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <motion.span
                    className="inline-block size-2 rounded-full bg-[var(--color-background)]"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.1, repeat: Number.POSITIVE_INFINITY }}
                  />
                  {voice.state === "speaking"
                    ? "speaking…"
                    : voice.state === "listening"
                      ? "listening… tap to send"
                      : "transcribing…"}
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scene + annotations — cols 8–12 */}
      <div className="relative lg:col-span-6 lg:col-start-7">
        <div className="mx-auto aspect-square w-full max-w-[520px]">
          <Scene mode="interview" facetCount={facetCount} motifTints={tints} />
        </div>

        {/* Captured facets — small scrapbook paper cards stacking down the margin.
            Only ever the facets the user actually gave. */}
        <ul className="mt-6 flex flex-col items-start gap-2.5">
          <AnimatePresence>
            {annotations.map((a, i) => (
              <motion.li
                key={annotationKey(a)}
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: 16, rotate: 0 }}
                animate={{ opacity: 1, x: 0, rotate: FACET_ROTATE[i % FACET_ROTATE.length] }}
                transition={
                  reduce
                    ? { duration: 0.15 }
                    : { type: "spring", stiffness: 280, damping: 24, delay: i * 0.06 }
                }
              >
                <div className="paper-shadow inline-flex items-center gap-2 rounded-paper bg-white px-3.5 py-2 text-[var(--color-foreground)]">
                  <span
                    aria-hidden
                    className="font-hand text-[1.3rem] leading-none"
                    style={{
                      color: a.type === "exclusion" ? "var(--color-terracotta)" : undefined,
                    }}
                  >
                    {GLYPH_CHAR[a.glyph]}
                  </span>
                  <span
                    className="font-hand text-[1.5rem] leading-tight"
                    style={{ fontWeight: 600 }}
                  >
                    {a.label}
                  </span>
                  <span className="text-[var(--color-daffy)]">
                    <DrawnCheck size={18} delay={reduce ? 0 : 0.2} />
                  </span>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}

function countFacets(f: Facets): number {
  let n = 0;
  n += f.causes.length;
  if (f.geo.raw || f.geo.city || f.geo.state) n += 1;
  if (f.budget.amount != null) n += 1;
  n += f.exclusions.tags.length + f.exclusions.freeText.length;
  if (f.strategy) n += 1;
  if (f.risk) n += 1;
  if (f.horizon) n += 1;
  if (f.discretionaryReserve != null) n += 1;
  return n;
}
