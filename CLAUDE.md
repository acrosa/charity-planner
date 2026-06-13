# CLAUDE.md — working agreement for Charity Planner

This file is the operating manual for any Claude session working in this repo.
Read it first, then the three spec files it points to. Keep it short and current.

## What this project is

**Charity Planner** turns a short structured interview into a researched,
transparent, actionable giving strategy — the kind of philanthropic planning wealthy families pay advisors thousands for, free for everyone — with a clear handoff to act on it through Daffy. Full framing in `BRIEF.md`.

## Source of truth (read in this order)

1. **`BRIEF.md`** — problem, scope, definition of done, and the ordered TODO
   list. This is the build plan. **When you finish a TODO item, mark it `- [X]` in `BRIEF.md`** so progress is durable across sessions.
2. **`RUBRIC.md`** — the mandatory pass/fail grading contract. Gate only on
   behaviour that must always hold (sections render, dollar sums exact, excluded
   orgs never appear, the live URL works). Soft quality numbers are reported, not
   gated.
3. **`DESIGN.md`** — the visual + interaction spec. Minimal, typographic,
   ink-on-cream, paper-kit report. Follow its tokens exactly; do not invent
   colors, borders, or shadows.

## The loop (how we work here)

Feature → commit → self-verify → fix → next. Specifically:

- Build **one feature per commit**; the commit message records what was asked and
  what changed.
- After each feature, run `pnpm verify` and grade the latest output against
  `RUBRIC.md`. **Fix failures before moving on.** Catching and repairing your own
  failing gate is the point — don't skip it.
- Keep `typecheck`, `biome`, `vitest`, and the Playwright happy path green
  continuously. Don't let them rot.
- Prefer small, reviewable changes over big speculative ones.

## Commands

```bash
pnpm dev          # local dev server (http://localhost:3000)
pnpm build        # production build
pnpm start        # serve the production build
pnpm typecheck    # react-router typegen + tsc --noEmit
pnpm lint         # biome check (lint + format)
pnpm lint:fix     # biome check --write
pnpm test         # vitest run (unit)
pnpm e2e          # playwright (set BASE_URL to target a deployed URL)
pnpm db:generate  # drizzle-kit generate (schema -> ./drizzle SQL)
pnpm db:migrate   # create pgvector + pg_trgm extensions, then migrate
pnpm ingest       # embed + ingest the 10k corpus (stub today)
pnpm sanity       # eyeball retrieval on eval/queries.csv (stub today)
pnpm verify       # the gate: status table across code/unit/lint/flow checks
```

`pnpm verify` exits non-zero ONLY on deterministic, always-achievable checks. It
SKIPs (never FAILs) checks whose prerequisites are absent (`DATABASE_URL`,
`BASE_URL`). As features land, promote SKIPs to hard checks in `scripts/verify.ts`.

## Stack & layout

- **React Router 7** (framework mode, SSR) + **TypeScript** + **Vite** +
  **Tailwind CSS v4** (`@theme` tokens in `app/app.css`).
- **Drizzle** + **drizzle-kit** over **Neon/Fly Postgres** with `pgvector` +
  `pg_trgm`.
- **Animations:** `motion`. **Charts:** `recharts`. **Validation:** `zod`.
- **Tooling:** Biome (lint+format), Vitest (unit), Playwright (e2e). `tsx` runs scripts.

```
app/
  root.tsx              # fonts (Google CDN), Layout, ErrorBoundary
  routes.ts             # route table (grows: interview, report, /r/:slug, /api/*)
  app.css               # Tailwind v4 + the ONLY design tokens
  routes/               # home.tsx (landing), api.health.ts, ...
  lib/causeColor.ts     # cause slug -> tint bucket + LITERAL hex (for SVG/charts)
  db/{schema,client}.ts # charities + reports tables; lazy postgres-js client
  pipeline/             # pure, testable logic (allocation.ts is the gated one)
scripts/                # verify, migrate, ingest, sanity (tsx)
eval/queries.csv        # hand-picked retrieval sanity queries (incl. exclusions)
e2e/                    # Playwright specs (smoke now; S1/S2/S3 personas later)
data/daffy_portfolios.json   # real Daffy portfolios + deterministic selection rules
dataset/charities_10k.jsonl  # the corpus to embed + ingest
qa-test-reports/        # per-scenario screenshots for human audit
```

## Hard rules

- **Zod at every boundary.** API request/response, the interview's
  `facets_captured` payload, and every LLM structured output is `safeParse`d
  before use. A malformed LLM reply degrades gracefully — it never throws to the user.
- **Never fabricate facets.** Only show/annotate facets the user actually gave;
  unasked facets stay `null`. (RUBRIC S1/S3 assert this.)
- **Exclusions are sacred.** Structurally-excluded orgs must never appear in the
  top 10 or anywhere in the report. Free-text exclusions (e.g. "nothing affiliated
  with Stanford") are honored via extracted predicates + a final scrub.
- **Allocations sum exactly.** Portfolio dollar amounts total the budget to the
  cent. `app/pipeline/allocation.ts` is the one gated unit test — don't break it.
- **Design tokens only.** Use the tokens in `app/app.css` / `causeColor.ts`. No
  gradients, glassmorphism, or shadows except the single paper contact shadow.
  Daffy green (`#3d7252`) is reserved exclusively for Daffy actions.
- **SVG/recharts fills use literal hex, never CSS vars** — `var(--color-cause-*)`
  renders black in `<Cell fill>` / `<circle fill>`. Use `causeColor()`.
- **Secrets never get committed.** `.env.local` holds the live keys; `.env.example`
  lists every required var. Fly secrets via `fly secrets set`.

## Services & env

See `.env.example`. Required: `ANTHROPIC_API_KEY` (model `claude-opus-4-8`),
`VOYAGE_API_KEY` (`voyage-4` embeddings + `rerank-2.5`), `DATABASE_URL` (Neon/Fly
Postgres), `FLY_API_TOKEN` (CI deploy). Optional: `MOTION_TOKEN` (premium Motion+
patterns — app falls back without it), `ELEVENLABS_API_KEY` (voice mode).

## When you're blocked

If you genuinely need a human decision or hit a hurdle you can't resolve, get the
user's attention (number in `.env.local` as `USER_IMESSAGE`):

```bash
imsg send --to "$USER_IMESSAGE" --text "<what you need>"
say "<short spoken nudge>"
```

Use sparingly — the spec is detailed on purpose so you can keep going.
