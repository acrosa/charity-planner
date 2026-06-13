// ─────────────────────────────────────────────────────────────────────────────
// HOW TO ADD A NOTE TO THE TIMELINE
//
// The timeline is just an ordered list of <Ev> blocks inside <HowItWasMade>
// below. To add a note, drop a new <Ev> where it belongs chronologically and
// fill it with a card. Copy the nearest existing event of the same shape — they
// are intentionally repetitive so this stays a paste-and-edit job.
//
//   <Ev time="1:42" mer="pm" color={CAUSE_HEX.education}>   // time rail + node dot
//     <Paper tone="white" rotate={1.5} className="p-6 sm:p-7">
//       <h2 className={HEADLINE}>Short title.</h2>          // ONE serif headline
//       <p className="mt-2 text-[15px] text-foreground/85">…body…</p>
//     </Paper>
//   </Ev>
//
// • time / mer — the clock label on the left rail ("9:00" + "am"). Keep times
//   monotonic top-to-bottom.
// • color — the node dot. Use INK for a plain beat, or a CAUSE_HEX.* tint when
//   the note is about that cause (food/animals/environment/…).
// • tone — paper color: "white" | "butter" | "terracotta" | "receipt". "white"
//   is the plain card; vary tone from the neighbours; give each paper a small
//   resting rotate (−2.5…2.5).
//
// THE CALM RULE (a design review locked this in — please keep it):
//   1. One headline per card, always `className={HEADLINE}` (serif, one size).
//   2. Body copy is Inter (the default). That's the workhorse.
//   3. Mono (font-mono) is ONLY for real data/labels/code — filenames, metrics,
//      terminal output, timestamps. Never for decorative chips.
//   4. Handwriting (<MarginNote>, font-hand) appears at most once per card, and
//      only when it's the card's SOLE accent (an aside, a reaction). Don't stack
//      it on top of a mono row — that's the noise we removed.
//   Aim for ≤3 type families in any one card.
//
// PRIMITIVES (all in ~/scrapbook/primitives) — reach for the matching one:
//   Paper .............. the card wrapper (tone + rotate + entrance spring)
//   Terminal + Prompt .. a mac-style terminal for commands / pipeline logs
//   DrawnCheck ......... a checkmark that draws in — see the services checklist
//   CountUp ............ a number that counts up in view (the 10,000 card)
//   ProgressBar ........ a thin fill bar
//   MapFrame ........... a toned, pinned OpenStreetMap embed (give it a bbox)
//   Doodle ............. hand-drawn inline icon: pin coffee meter music spark
//                        eye file scissors arrow heart
//   MarginNote ......... the one handwritten aside (see the calm rule)
//   Stamp / Seal ....... a dashed "Nº 04" stamp / circular seal flourish
//   CauseRule .......... a short cause-tinted rule (the only color on an entry)
//   Persona / ScoreBars  the retrieval-results block + rerank bars
//
// PREVIEW:  pnpm dev --port 3100  →  http://localhost:3100/how-it-was-made
//   (prefers-reduced-motion renders every card at its final state — handy for
//    screenshots, since cards otherwise animate in only when scrolled into view.)
// BEFORE COMMITTING:  npx biome check --write app/scrapbook app/routes/how-it-was-made.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useRef } from "react";
import { Link } from "react-router";
import { CAUSE_HEX } from "~/lib/causeColor";
import {
  CauseRule,
  CountUp,
  Doodle,
  DrawnCheck,
  Equalizer,
  MapFrame,
  MarginNote,
  Paper,
  ProgressBar,
  Prompt,
  Seal,
  Stamp,
  Terminal,
  Thread,
  Node as ThreadNode,
} from "~/scrapbook/primitives";
import type { Route } from "./+types/how-it-was-made";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "How it was made — Charity Planner" },
    {
      name: "description",
      content:
        "A scrapbook timeline of the hackathon day that built Charity Planner — live, at Shack15 in San Francisco.",
    },
  ];
}

const INK = "#1b1a17";

// One headline treatment for every card, so the page reads with a single, calm
// hierarchy: serif display for the title, Inter for the body, mono only for real
// data/labels, and handwriting only as a card's sole aside.
const HEADLINE = "font-display text-[1.5rem] font-medium leading-tight";

// One event slot on the timeline: a right-aligned time, a node on the thread, and
// the bespoke card(s) to its right. Returns three grid cells (parent is the grid).
function Ev({
  time,
  mer,
  color = INK,
  children,
}: {
  time: string;
  mer?: string;
  color?: string;
  children: ReactNode;
}) {
  return (
    <>
      <time className="justify-self-end pt-0.5 text-right font-mono text-[13px] text-foreground tabular-nums leading-tight tracking-[0.02em]">
        {time}
        {mer ? <span className="ml-0.5 text-[0.72em] text-muted">{mer}</span> : null}
      </time>
      <span className="justify-self-center pt-1.5">
        <ThreadNode color={color} />
      </span>
      <div className="min-w-0 pb-16 pl-4 sm:pb-24 sm:pl-7">{children}</div>
    </>
  );
}

// Decorative rerank-score bars for Sam's wildlife matches (0.70–0.83).
function ScoreBars() {
  const reduce = useReducedMotion();
  const scores = [0.78, 0.83, 0.71, 0.8, 0.74, 0.82, 0.7, 0.76, 0.79, 0.72];
  return (
    <span className="flex h-9 items-end gap-[3px]" aria-hidden="true">
      {scores.map((s, i) => (
        <motion.span
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative bars
          key={i}
          className="w-[5px] rounded-[2px]"
          style={{ backgroundColor: CAUSE_HEX.animals, height: `${((s - 0.65) / 0.2) * 100}%` }}
          initial={reduce ? false : { scaleY: 0 }}
          whileInView={reduce ? undefined : { scaleY: 1 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.5, delay: i * 0.04, ease: "easeOut" }}
        />
      ))}
    </span>
  );
}

// A persona retrieval result: cause-tinted rule + serif name + outcome line.
function Persona({ name, color, children }: { name: string; color: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <CauseRule color={color} />
      <p className="font-display text-[1.15rem]" style={{ fontWeight: 500 }}>
        {name}
      </p>
      <div className="text-[15px] text-foreground/85 leading-relaxed">{children}</div>
    </div>
  );
}

const SERVICES: Array<{ label: string; detail: string }> = [
  { label: "claude-opus-4-8", detail: "the model" },
  { label: "web_search", detail: "reachable" },
  { label: "voyage-4", detail: "1024-dim · matches schema" },
  { label: "rerank-2.5", detail: "food bank ranks #1" },
  { label: "postgres 18.4", detail: "pgvector · pg_trgm" },
  { label: "fly.io", detail: "deploy-ready" },
];

// The `pnpm verify` gate, run against the live URL — the payoff card mirrors the
// services checklist (same DrawnCheck rhythm) to bookend the day.
const VERIFY: Array<{ label: string; detail: string }> = [
  { label: "typecheck + biome", detail: "clean" },
  { label: "27 unit tests", detail: "green" },
  { label: "ingest", detail: "10,000 rows embedded" },
  { label: "no-leak", detail: "0 forbidden in top 10" },
  { label: "smoke", detail: "/ + /api/health · 200" },
  { label: "playwright", detail: "happy path" },
];

export default function HowItWasMade() {
  const timelineRef = useRef<HTMLDivElement>(null);

  return (
    <main className="min-h-screen px-[clamp(24px,5vw,96px)] py-[clamp(28px,5vh,72px)]">
      {/* Meta strip — consistent with the app: one mono line, no border. */}
      <header className="mx-auto flex max-w-3xl items-baseline justify-between font-mono text-[11px] text-muted uppercase tracking-[0.08em]">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-70"
        >
          <span className="text-terracotta">←</span> charity planner
        </Link>
        <span className="hidden sm:inline">how it was made</span>
        <span>shack15 · sf</span>
      </header>

      {/* Title block. */}
      <section className="mx-auto mt-[10vh] flex max-w-3xl items-start justify-between gap-8">
        <div>
          <p className="flex items-center gap-2 font-mono text-[12px] text-muted uppercase tracking-[0.08em]">
            <span className="size-[6px] rounded-full bg-terracotta" />a hackathon, in real time
          </p>
          <h1
            className="mt-5 font-display leading-[1.05] tracking-[-0.01em]"
            style={{ fontWeight: 380, fontSize: "clamp(2.6rem, 7vw, 5rem)" }}
          >
            how it was <em className="italic">made</em>
          </h1>
          <p className="mt-6 max-w-md text-[15px] text-muted leading-relaxed">
            One afternoon at Shack15 — a brief, a spec, a rubric, and an agent let loose. These are
            the notes, in the order they happened.
          </p>
        </div>
        <div className="mt-2 hidden shrink-0 text-terracotta sm:block">
          <Seal>
            built live
            <br />
            no. 0613
          </Seal>
        </div>
      </section>

      {/* The timeline. A single grid so time/node/content columns align across
          rows; the thread draws down its spine as you scroll. */}
      <div
        ref={timelineRef}
        className="relative mx-auto mt-[12vh] grid max-w-3xl items-start"
        style={{
          ["--time" as string]: "clamp(50px, 7vw, 84px)",
          ["--spine" as string]: "34px",
          gridTemplateColumns: "var(--time) var(--spine) minmax(0,1fr)",
        }}
      >
        <div
          className="absolute inset-y-0"
          style={{ left: "calc(var(--time) + var(--spine) / 2 - 0.5px)", right: "auto" }}
        >
          <Thread targetRef={timelineRef} />
        </div>

        {/* 1 — Arrival + map */}
        <Ev time="9:00" mer="am" color={CAUSE_HEX.fallback}>
          <Paper tone="white" rotate={-1.5} className="p-6 sm:p-7">
            <div className="mb-3 flex justify-end">
              <Stamp label="Nº 01" />
            </div>
            <h2 className={HEADLINE}>Arrived.</h2>
            <p className="mt-2 mb-4 text-[15px] text-foreground/85">
              Shack15 — Ferry Building, Suite 201, San Francisco.
            </p>
            <MapFrame bbox="-122.3985,37.7930,-122.3889,37.7980" caption="ferry building, sf" />
            <MarginNote rotate={-2} className="mt-4">
              parked blocks away — and it’s hot out 🥵
            </MarginNote>
          </Paper>
        </Ev>

        {/* 2 — Before kickoff: people, coffee, music */}
        <Ev time="9–10" mer="am" color={CAUSE_HEX.food}>
          <div className="space-y-5">
            <Paper tone="butter" rotate={1.8} className="p-6 sm:p-7">
              <h2 className={HEADLINE}>Before kickoff.</h2>
              <p className="mt-3 text-[15px] text-foreground/85">
                Met people over coffee — conversation ran from agent evals to enterprise features to
                what everyone was about to build.
              </p>
              <p className="mt-5 flex items-start gap-2.5 font-hand text-[1.5rem] leading-tight text-foreground/80">
                <Doodle name="coffee" size={26} className="mt-1 shrink-0" /> the coffee was
                3D-printed — sent a photo to my kid, who 3D-prints 🤍
              </p>
            </Paper>

            <Paper tone="receipt" rotate={-1.6} className="flex items-center gap-4 p-5">
              <span className="text-foreground/70">
                <Equalizer />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[10px] text-muted uppercase tracking-[0.1em]">
                  now playing
                </p>
                <p className="text-[15px]" style={{ fontWeight: 600 }}>
                  Claude FM — live coding radio
                </p>
              </div>
              <a
                href="https://www.youtube.com/watch?v=tRsQsTMvPNg"
                target="_blank"
                rel="noreferrer"
                className="ml-auto shrink-0 font-mono text-[12px] tracking-[0.04em] transition-opacity hover:opacity-70"
              >
                ▶ youtube <span className="text-terracotta">→</span>
              </a>
            </Paper>
          </div>
        </Ev>

        {/* 3 — Wrote the spec */}
        <Ev time="10:00" mer="am" color={INK}>
          <Paper tone="receipt" rotate={1.4} className="p-6 sm:p-7">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-[11px] text-muted uppercase tracking-[0.08em]">
                10:00a – 12:30p
              </p>
              <Stamp label="Nº 02" />
            </div>
            <h2 className={HEADLINE}>Wrote the spec.</h2>
            <p className="mt-2 text-[15px] text-foreground/85">
              ~2 hours turning earlier ideas — and the accounts I’d set up before the event — into
              three files that did the heavy lifting later.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
              {["BRIEF.md", "DESIGN.md", "RUBRIC.md"].map((f) => (
                <span key={f} className="flex items-center gap-2 font-mono text-[13px]">
                  <Doodle name="file" size={18} /> {f}
                </span>
              ))}
            </div>
          </Paper>
        </Ev>

        {/* 4 — Parking, again (recurring gag) */}
        <Ev time="12:30" mer="pm" color={CAUSE_HEX.fallback}>
          <Paper tone="terracotta" rotate={-2.5} className="max-w-sm p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] opacity-70">
              intermission
            </p>
            <p className="mt-2 flex items-start gap-3 text-[15px] leading-snug">
              <span className="shrink-0">
                <Doodle name="meter" size={26} />
              </span>
              Ran 15 minutes back to the car to re-pay the meter. Again. 🥵
            </p>
          </Paper>
        </Ev>

        {/* 5 — The decision */}
        <Ev time="1:00" mer="pm" color={INK}>
          <Paper tone="white" rotate={1} className="p-6 sm:p-7">
            <h2 className={HEADLINE}>
              ultracode? <em className="italic">yes.</em>
            </h2>
            <p className="mt-2 text-[15px] text-foreground/85">
              Wavered on whether to use ultracode + workflows. A two-minute Q&amp;A with Claude
              settled it — exactly what this needed.
            </p>
          </Paper>
        </Ev>

        {/* 6 — Fired the goal */}
        <Ev time="1:00" mer="pm" color={CAUSE_HEX.food}>
          <Terminal title="claude — /goal">
            <Prompt>
              <span className="text-butter">/goal</span> let’s work on{" "}
              <span className="text-butter">@BRIEF.md</span>, read{" "}
              <span className="text-butter">@DESIGN.md</span> and follow{" "}
              <span className="text-butter">@RUBRIC.md</span> to verify the work is done. Build it
              to a level of quality that wows people on the demo. All third-party services are
              already set up — so iterate on the definitions and get it deployed end-to-end. The{" "}
              <span className="text-background underline decoration-terracotta decoration-2 underline-offset-2">
                RUBRIC.md must pass all the verifications
              </span>
              .
            </Prompt>
            <p className="mt-3 text-background/55">↳ goal set. agent running.</p>
          </Terminal>
        </Ev>

        {/* 7 — All services green */}
        <Ev time="1:23" mer="pm" color={INK}>
          <Paper tone="receipt" rotate={-1.2} className="p-6 sm:p-7">
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`flex items-center gap-2 ${HEADLINE}`}>
                <Doodle name="spark" size={22} /> All services green.
              </h2>
              <span className="shrink-0 rounded-full bg-foreground/8 px-2.5 py-1 font-mono text-[10px] text-muted uppercase tracking-[0.1em]">
                T+23 min
              </span>
            </div>
            <ul className="space-y-2.5 font-mono text-[13px]">
              {SERVICES.map((s, i) => (
                <li key={s.label} className="flex items-baseline gap-3">
                  <span className="translate-y-1 text-foreground">
                    <DrawnCheck size={18} delay={0.1 + i * 0.08} />
                  </span>
                  <span className="font-medium">{s.label}</span>
                  <span className="text-muted">{s.detail}</span>
                </li>
              ))}
            </ul>
            <MarginNote rotate={-2.5} className="mt-5">
              incredible.
            </MarginNote>
          </Paper>
        </Ev>

        {/* 8 — The avalanche (pipeline log) */}
        <Ev time="1:25" mer="pm" color={CAUSE_HEX.food}>
          <Terminal title="claude — pipeline">
            <div className="space-y-1.5">
              <div className="flex gap-3">
                <span className="shrink-0 text-background/45">1:25</span>
                <span className="min-w-0">
                  <span className="text-terracotta">❯</span> db:migrate — charities table created ✓
                </span>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 text-background/45">1:31</span>
                <span className="min-w-0">
                  <span className="text-terracotta">❯</span> ingest — rows landing 🎉
                </span>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 text-background/45">1:33</span>
                <span className="min-w-0">
                  <span className="text-terracotta">❯</span> embed (voyage-4) — 99.36%{" "}
                  <span className="text-background/55">(9,936 / 10,000)</span>
                </span>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 text-background/45">1:33</span>
                <span className="min-w-0">
                  <span className="text-terracotta">❯</span> ingest --backfill — 64 stragglers ✓
                </span>
              </div>
            </div>
          </Terminal>
        </Ev>

        {/* 9 — 100% embedded */}
        <Ev time="1:33" mer="pm" color={CAUSE_HEX.environment}>
          <Paper tone="butter" rotate={-1.5} className="p-6 sm:p-7">
            <p className="font-mono text-[11px] text-foreground/70 uppercase tracking-[0.08em]">
              corpus embedded · voyage-4 · 1024-dim
            </p>
            <p
              className="mt-2 font-display leading-none"
              style={{ fontWeight: 380, fontSize: "clamp(3rem, 9vw, 5rem)" }}
            >
              <CountUp from={9936} to={10000} />
            </p>
            <p className="mt-1 mb-4 text-[15px] text-foreground/80">
              charities, every one with a non-null embedding. 100%.
            </p>
            <ProgressBar pct={100} color={INK} />
            <p className="mt-4 text-[13px] text-foreground/65">
              One batch of 64 failed transiently — but ingest is idempotent, so a re-run quietly
              backfilled them.
            </p>
          </Paper>
        </Ev>

        {/* 10 — Retrieval, first try */}
        <Ev time="1:36" mer="pm" color={INK}>
          <Paper tone="white" rotate={1.4} className="p-6 sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <h2 className={HEADLINE}>Retrieval, first try.</h2>
              <Stamp label="Nº 03" />
            </div>
            <div className="space-y-6">
              <Persona name="Maria" color={CAUSE_HEX.food}>
                7 California food &amp; education orgs — right region, right causes.
              </Persona>
              <Persona name="The Chens" color={CAUSE_HEX.faith}>
                Asked to exclude religion, and the religious org{" "}
                <span className="text-muted line-through decoration-foreground/40">stayed in</span>{" "}
                — it dropped, correctly. Exclusions held.
              </Persona>
              <Persona name="Sam" color={CAUSE_HEX.animals}>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <span>10 wildlife orgs, every one on-target.</span>
                  <span className="flex flex-col items-end gap-1">
                    <ScoreBars />
                    <span className="font-mono text-[11px] text-muted">rerank 0.70–0.83</span>
                  </span>
                </div>
              </Persona>
            </div>
          </Paper>
        </Ev>

        {/* 11 — The honest miss */}
        <Ev time="1:37" mer="pm" color={CAUSE_HEX.fallback}>
          <Paper tone="terracotta" rotate={-2} className="max-w-md p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] opacity-70">
              honest note
            </p>
            <p className="mt-2 text-[15px] leading-relaxed">
              “red cross” didn’t surface the American Red Cross — it simply isn’t in this 10k
              subset. Rerank sensibly returned Magen David Adom (Israel’s Red Cross) and blood
              centers. A corpus reality, not a bug — so I aligned the sanity queries to orgs that
              are actually present.
            </p>
          </Paper>
        </Ev>

        {/* 12 — Meanwhile… (meta closer) */}
        <Ev time="1:39" mer="pm" color={INK}>
          <Paper tone="white" rotate={1} className="p-6 sm:p-7">
            <h2 className={`flex items-center gap-2.5 ${HEADLINE}`}>
              <Doodle name="eye" size={24} /> Meanwhile…
            </h2>
            <p className="mt-2 text-[15px] text-foreground/85">
              Got a little bored waiting on the agent — so I opened a second session and started
              this very page.
            </p>
            <p className="mt-4 flex items-center gap-2 font-hand text-[1.6rem] text-terracotta">
              <Doodle name="arrow" size={22} /> you’re reading it.
            </p>
          </Paper>
        </Ev>

        {/* 13 — Tests before the UI */}
        <Ev time="1:46" mer="pm" color={CAUSE_HEX.research}>
          <Paper tone="receipt" rotate={-1.3} className="p-6 sm:p-7">
            <h2 className={HEADLINE}>Tests before pixels.</h2>
            <p className="mt-2 text-[15px] text-foreground/85">
              Backend typechecked clean — and before a single component, it wrote a scenario harness
              to check the RUBRIC assertions at the data layer: facets captured, dollars summing,
              exclusions holding.
            </p>
            <MarginNote rotate={-2} className="mt-4">
              data first, then pixels.
            </MarginNote>
          </Paper>
        </Ev>

        {/* 14 — Very meta: it reads its own docs */}
        <Ev time="1:47" mer="pm" color={INK}>
          <Terminal title="claude — self-check">
            <Prompt>
              <span className="text-butter">temperature</span> is deprecated for{" "}
              <span className="text-butter">opus-4-8</span> — let me check the claude-api reference
              rather than guess.
            </Prompt>
            <p className="mt-3 text-background/55">↳ the model, reading its own docs. very meta.</p>
          </Terminal>
        </Ev>

        {/* 15 — Deployed, and the first report is good */}
        <Ev time="2:22" mer="pm" color={CAUSE_HEX.food}>
          <Paper tone="butter" rotate={1.6} className="p-6 sm:p-7">
            <div className="mb-4 flex items-center justify-between">
              <h2 className={HEADLINE}>Deployed — and it’s good.</h2>
              <Stamp label="Nº 04" />
            </div>
            <p className="text-[15px] text-foreground/85">
              First full report on Fly in <span className="font-mono text-[13px]">18.8s</span>.
              Maria’s plan came back demo-quality on the very first run.
            </p>
            <div className="mt-5 flex items-center gap-3 font-mono text-[15px]">
              <span className="mr-1 text-[10px] text-foreground/55 uppercase tracking-[0.12em]">
                top-3 split
              </span>
              <span>$50</span>
              <span className="text-foreground/40">+</span>
              <span>$30</span>
              <span className="text-foreground/40">+</span>
              <span>$20</span>
              <span className="text-foreground/40">=</span>
              <span style={{ fontWeight: 600 }}>$100</span>
            </div>
            <p className="mt-4 text-[15px] text-foreground/80">
              Eight California orgs, zero political, a first-person philosophy in her own words, and
              the right Daffy fork fund.
            </p>
          </Paper>
        </Ev>

        {/* 16 — The hardest scenario sets up the tension */}
        <Ev time="2:27" mer="pm" color={CAUSE_HEX.faith}>
          <Paper tone="terracotta" rotate={-2.2} className="max-w-md p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] opacity-70">
              the hardest test
            </p>
            <h2 className={`mt-2 ${HEADLINE}`}>The Chens.</h2>
            <p className="mt-2 text-[15px] leading-relaxed">
              Full mode, two exclusions at once: no religious orgs (structured) and nothing
              Stanford-affiliated (free text). The ambitious bet — can it honor a constraint you
              only typed in passing?
            </p>
          </Paper>
        </Ev>

        {/* 17 — All green: the verify gate passes vs. live */}
        <Ev time="2:44" mer="pm" color={CAUSE_HEX.environment}>
          <Paper tone="receipt" rotate={-1.4} className="p-6 sm:p-7">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-mono text-[11px] text-muted uppercase tracking-[0.08em]">
                  pnpm verify · vs. live url
                </p>
                <h2 className={`mt-1 ${HEADLINE}`}>All green. 🎉</h2>
              </div>
              <Stamp label="Nº 05" />
            </div>
            <ul className="space-y-2.5 font-mono text-[13px]">
              {VERIFY.map((c, i) => (
                <li key={c.label} className="flex items-baseline gap-3">
                  <span className="translate-y-1 text-foreground">
                    <DrawnCheck size={18} delay={0.1 + i * 0.08} />
                  </span>
                  <span className="font-medium">{c.label}</span>
                  <span className="text-muted">{c.detail}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[15px] text-foreground/80">
              Plus the sanity queries and all three live scenarios — S1, S2, S3 — passing
              end-to-end.
            </p>
          </Paper>
        </Ev>

        {/* 18 — Goal achieved */}
        <Ev time="2:55" mer="pm" color={CAUSE_HEX.environment}>
          <div className="space-y-5">
            <Terminal title="claude — /goal">
              <p className="text-butter">
                ✔ Goal achieved{" "}
                <span className="text-background/60">(1h · 1 turn · 296.6k tokens)</span>
              </p>
              <p className="mt-2 text-background/55">
                ↳ on to the delight features — voice, motion, the reveal.
              </p>
            </Terminal>
            <MarginNote rotate={-2}>…and I hadn’t touched it once since 12:30 🤯</MarginNote>
          </div>
        </Ev>

        {/* 19 — The thesis / closer */}
        <Ev time="3:03" mer="pm" color={INK}>
          <Paper tone="white" rotate={1} className="p-6 sm:p-7">
            <h2 className={HEADLINE}>One afternoon, one prompt.</h2>
            <p className="mt-2 text-[15px] text-foreground/85">
              After 12:30, my only input was a handful of design tweaks. A detailed brief and a
              strict rubric let the agent one-shot the build, grade its own work, and fix its own
              misses — untouched.
            </p>
            <p className="mt-5 flex items-center gap-2 font-hand text-[1.7rem] text-terracotta">
              <Doodle name="heart" size={24} /> even these notes — made with Claude.
            </p>
          </Paper>
        </Ev>
      </div>

      {/* Colophon. */}
      <footer className="mx-auto mt-8 max-w-3xl border-hairline border-t pt-6 font-mono text-[11px] text-muted uppercase tracking-[0.08em]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>built live · shack15 · san francisco · jun 13 2026</span>
          <Link to="/" className="transition-opacity hover:opacity-70">
            <span className="text-terracotta">←</span> back to charity planner
          </Link>
        </div>
      </footer>
    </main>
  );
}
