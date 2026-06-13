# Charity Planner

_Turn your values into a clear plan for giving._

Most people want to be more generous — they just don't know where to start. With
2M+ U.S. nonprofits, choosing where to give is overwhelming. Wealthy families
solve this by hiring philanthropic advisors who charge thousands a year to build
a giving strategy and a charitable portfolio.

**Charity Planner makes that service free for everyone.** A short, conversational
interview turns your explicit preferences into a researched, transparent,
actionable giving strategy — philosophy → strategy → a charity portfolio with
exact dollar allocations → a plan → an educational Daffy portfolio comparison —
with the reasoning and source behind every charity and every figure, and a clear
handoff to act on the plan through [Daffy](https://www.daffy.org).

> Built for the **Claude Build Day** hackathon.

## How it works

1. **Interview** — a short structured conversation (quick: 3 questions, or full)
   captures causes, goals, timeline, constraints, and risk preferences. Facets are
   only ever captured from what you actually say — nothing is fabricated.
2. **Retrieve** — your philosophy is expanded into retrieval queries and exclusion
   predicates; candidates are recalled from a 10k-charity corpus via vector search
   (`pgvector`) ∪ a trigram name leg, then reranked (Voyage `rerank-2.5`),
   diversified, and scrubbed against your exclusions.
3. **Report** — a personalized giving report: first-person philosophy, strategy,
   a portfolio with exact dollar math and a chart, ranked charities each with a
   "why this fits you" line and current news, a monthly plan, and a recommended
   Daffy fund portfolio.

Every recommendation and dollar figure shows its reasoning. Excluded
organizations never appear. Portfolio amounts always sum to your budget exactly.

## Tech stack

- **React Router 7** (framework mode, SSR) · **TypeScript** · **Vite** ·
  **Tailwind CSS v4**
- **Drizzle ORM** over **Postgres** with **`pgvector`** + **`pg_trgm`**
- **Claude** (`claude-opus-4-8`) for the interview, expansion, personalization,
  and news web search · **Voyage AI** (`voyage-4` embeddings + `rerank-2.5`)
- **`motion`** for animation · **`recharts`** for the portfolio chart ·
  **Zod** for validation at every boundary
- **ElevenLabs** (optional hands-free voice mode) · **Daffy** charity deep links
- Hosted on **Fly.io**; tooling: **Biome**, **Vitest**, **Playwright**

## Repository map

| Path | What it is |
| --- | --- |
| [`BRIEF.md`](./BRIEF.md) | Problem, scope, definition of done, and the ordered build plan |
| [`DESIGN.md`](./DESIGN.md) | The visual + interaction spec (tokens, layout, animations) |
| [`RUBRIC.md`](./RUBRIC.md) | The pass/fail grading contract and the 3 integration scenarios |
| [`CLAUDE.md`](./CLAUDE.md) | The working agreement / operating manual for the build |
| `app/` | React Router app — routes, design tokens, db schema, pipeline logic |
| `scripts/` | `verify`, `migrate`, `ingest`, `sanity` |
| `data/daffy_portfolios.json` | Real Daffy portfolios + deterministic selection rules |
| `dataset/charities_10k.jsonl` | The charity corpus to embed and ingest |
| `eval/queries.csv` | Hand-picked retrieval sanity queries (incl. exclusions) |
| `e2e/` | Playwright specs |

## Getting started

Requires Node ≥ 22 and `pnpm`.

```bash
pnpm install
cp .env.example .env.local   # then fill in the keys (never commit them)
pnpm dev                     # http://localhost:3000
```

Database (Postgres with `pgvector` + `pg_trgm`):

```bash
pnpm db:generate   # generate SQL migrations from the Drizzle schema
pnpm db:migrate    # create extensions, then apply migrations
pnpm ingest        # embed + ingest dataset/charities_10k.jsonl
```

### Verifying

`pnpm verify` is the single gate — it prints a status table across typecheck,
lint, unit tests, and (when `DATABASE_URL` / `BASE_URL` are set) ingest, no-leak
exclusion, smoke, and Playwright checks. It fails only on deterministic,
always-achievable checks; see [`RUBRIC.md`](./RUBRIC.md).

```bash
pnpm verify                            # local code/unit/lint checks
BASE_URL=https://<app>.fly.dev pnpm verify   # also runs smoke + e2e vs live
```

## Configuration

All secrets live in `.env.local` (git-ignored); `.env.example` lists every
required variable. The premium **Motion+** registry (`MOTION_TOKEN`) and
**ElevenLabs** voice mode (`ELEVENLABS_API_KEY`) are optional — the app falls
back gracefully without them (the cream "blinds" screen transition is
hand-rolled and needs no token).

## License

Built for a hackathon; not currently licensed for redistribution.
