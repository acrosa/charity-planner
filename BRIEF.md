# Charity Planner

_Turn your values into a clear plan for giving._

## 1. Problem

Most people want to be more generous. They just don't know where to start. There are
more than 2 million nonprofits in the U.S., and choosing where to give is overwhelming.

Wealthy families solve this by hiring philanthropic advisors — typically paying thousands to tens of thousands of dollars a year — to build a giving strategy and a charitable portfolio. Charity Planner makes that service available to everyone, for free. A short conversation turns explicit donor preferences into a researched, transparent, actionable giving strategy, and a clear path to act on it through Daffy.

That's the impact: democratized access to a service that has, until now, been reserved for the wealthy.

## 2. Who it's for

Donors who know they want to give but lack a strategy — and Daffy as the activation surface where intent becomes real donations. Equally useful for first-time givers who want guidance and experienced donors who want a faster, more rigorous planning pass.

## 3. What we're building

#### In scope

A short structured interview (causes, goals, timeline, constraints, risk preferences). A personalized giving report: philosophy → strategy → charity portfolio (with exact dollar allocations) → plan → educational Daffy portfolio comparison. Per-recommendation transparency: every charity and every figure shows its reasoning and source. A clear handoff toward acting on the plan in Daffy.

## 4. How we direct Claude (orchestration)

The loop is simple and repeatable on purpose:
`BRIEF.md` (this file) sets problem, scope, and definition of done, in addition to the TODO tasks. `RUBRIC.md` encodes mandatory pass/fail gates (below). It's the model's grading contract. Build log + feature-by-feature commits. Each feature lands as its own commit; the log records what was asked and what changed. Self-verification gate. After each feature, Claude runs the test suite and grades the latest output against RUBRIC.md, then fixes failures before moving on. The moment it catches and repairs its own failing gate is the orchestration story we demo.

#### Orchestration

KISS approach. We run the model with: `claude --enable-auto-mode --permission-mode bypassPermissions` while there are more sophisticated orchestrations the models are good enough to follow a detailed todo list like `BRIEF.md` and continue and iterate the work.

#### Issues and roadmblocks:
If the model requires intervention from the user to make a decision or a hurdle on the process you can call the user's attention by texting him on iMessage:

```bash
imsg send --to "+1650...." --text "<MESSAGE>"
```
The phone number can be found in the .env config as `USER_IMESSAGE`.

Additionally you can call his attention by using the `say` which makes an audible text to speech on the user's machine:

```bash
say "<MESSAGE>"
```

---

## 5. How we're building it (detailed spec & TODO list)

- [X] 1. Verify the third-party services are accessible, we can authenticate and use them. See `.env.local`. Services:
  - **Anthropic Claude** — interview, expansion, personalization, and news web search (`claude-opus-4-8`) · `ANTHROPIC_API_KEY` · _required_
  - **Voyage AI** — embeddings (`voyage-4`) + reranker (`rerank-2.5`) · `VOYAGE_API_KEY` · _required_ · full 10k corpus embedded; `rerank-2.5` runs live.
  - **Neon** — managed Postgres with `pgvector` + `pg_trgm` · `DATABASE_URL` · _required_
  - **Fly.io** — app hosting/deploy · `fly` CLI auth (`FLY_API_TOKEN` in CI) · _required_
  - **Daffy** — charity deep links (`daffy.org/charities/{ein}`) + the portfolio catalog (`data/daffy_portfolios.json`) · public, no key
  - **Motion+ (Motion AI Kit)** — premium animation registry · `MOTION_TOKEN` · _optional, app falls back without it_
  - **ElevenLabs** — voice mode: agent TTS (spoken questions) + Scribe STT (spoken answers) · `ELEVENLABS_API_KEY` · **TTS + Scribe STT both work; voice is hands-free** (auto-listen + silence-VAD or full bidirectional if Eleven labs api supports it easily). Typed input always remains.
- [X] 2. Process the raw charity data (`dataset/charities_10k.jsonl` file), and generate embeddings for the mission statementes and descriptions; then ingest it into our PostgreSQL table. We will use this table to do vector search when recommending charities in our pipeline. _(full 10k ingested, all embedded)_
- [X] 3. Setup the typescript react web app. Including the design style guidelines, dependencies, linter, tests and integration tests. When running tests for final verification let's save screenshots for the audit of core flows working, this will be used later to verify the app works end-to-end by humans (put each interview test on it's own folder `qa-test-reports/`).
- [X] 4. Perform a deployment of the basic web app structure (without the functionality). We want to test we can deploy and keep this always green.
- [X] 5. Implement the charity planner landing page following the design spec `DESIGN.md`.
- [X] 6. Implement the quick interview (we will do the default one later) which includes the animations, transitions and generation of the report (pipeline, questions, analysis, charities vetting and news, among other things). `DESIGN.md` helps with the design and look and feel here too.
- [X] 7. Verify the flow works end-to-end with integration tests using sample interview data to verify the reports make sense. Save screenshots on a subfolder in `qa-test-reports/`.
- [ ] 8. Make adjustments based on the evaluation of the reports quality. Iterate this until it's high quality.
- [X] 9. Deploy the MVP version to production and do a full end-to-end test there. _(live: https://<app>.fly.dev)_
- [ ] 10. Work on delight features, look at the report screenshots and make sure the layouts are readable and the design spec is reflected on the MVP `DESIGN.md`.
- [X] 11. Daffy portfolio allocation visualization, per-charity news grounding, etc. When presenting the report plan we want to show details about the portfolios (composition and a chart), small news quotes & links for the charities and other information that might be useful to augment the plan.
- [ ] 12. Voice mode — to make the experience delightful we can turn this into a voice interview. This will be specially useful for people who will answer an engage in a better way using voice conversations. A single toggle (default OFF until the user clicks it) that speaks the agent's questions (ElevenLabs TTS) and captures spoken answers (ElevenLabs Scribe STT); typed input + on-screen text always remain. Turning voice mode on/off should be easy accessible and clearly indicated on the UX as a prominent and subtly animated UI element.
- [X] 13. Shareable report URL. Once a user gets a plan it might be enticing to share it in social networks for others to try the tool. This could help turn the planner into a more viral loop so more people can benefit from it. Think `year in review` end of year viral experiences from spotify, apple music, and others.
- [ ] 14. Fully conversational experience — with voice mode on, the agent speaks and listens end-to-end (ElevenLabs TTS + Scribe STT), making the interview hands-free. _(hands-free: auto-listen + silence detection)_

**Important**: Given the size of the tasks outlined here keep a record of each step as a way to keep track what's done. Update this document with `- [X]` when done on a task. See `Orchestration` for more details.

### Step by Step

#### Setup & infra

- [X] Framework: React Router 7 + TypeScript, Vite, Tailwind CSS v4. Animations with `motion` (framer-motion); charts with `recharts`.
- [X] Drizzle + drizzle-kit; Neon connection; see `.env.example`. _(schema + lazy postgres-js client + drizzle.config.ts; live connection pending ingest)_
- [X] Wire Biome, Vitest, Playwright into package scripts
- [X] Create `pnpm db:migrate` — create the `pgvector` + `pg_trgm` extensions, then apply the checked-in Drizzle migrations (table + indexes). Extensions must exist before the migration runs because the table uses `vector(1024)/tsvector` and the indexes use `hnsw/gin_trgm_ops` operator classes. _(script created; runs against a live DB in the /goal phase)_
- Zod at every boundary — API request/response schemas, the interview's `facets_captured` payload, every LLM structured output is `safeParse`d before use (a malformed LLM reply degrades per, never throws to the user).
- [X] Quality tooling: Biome (`biome check`) for lint+format, Vitest for unit tests (pipeline logic: the diversity cap + near-dup dedup, allocation; the `embedding_text` builder; exclusion-predicate extraction + post-scrub; the rerank-fallback ordering), Playwright for the e2e happy path. All three wired into package scripts; keep them green continuously. Start early so we can progress step by step. _(wired + green; allocation unit test landed, the rest grow with the pipeline)_
- [ ] Deploy the basic skeleton (Hello World) to Fly.io; keep the URL green. Idea is to verify deployment on this step.
- [ ] Install the **Motion AI Kit — MCP** + `/motion` skill used for animation patterns; **blinds transition, hand-rolled, etc. the API key for it's already setup in `.env.local` as `MOTION_TOKEN`. Query current Motion docs instead of guessing APIs; consult premium example patterns for the interactions; generate spring/easing curves via the MCP. Sanity-check animations don't jank before moving on.
- Background work: none — news hydration runs in-request with a concurrency cap of 4 and progressive rendering. No queue, no workers. We can show the news as a progressiv enhancement not blocking the app functionality, so async on the report.
- Secrets: never commit keys. `.env.example` lists every required var.
- [X] Stub `scripts/verify.ts` (called with somethign like `pnpm verify`) early; grow it as features land. _(prints status table; SKIPs ingest/no-leak/smoke/playwright until DATABASE_URL/BASE_URL are set)_ The idea is to have a single command that checks the build and prints a status table across code, unit, linter and flow integration tests.

    Fails (exit non-zero) ONLY on deterministic, always-achievable checks:
    1. Typecheck + biome + vitest
    2. Ingest check
    3. No-leak: exclusion queries return zero forbidden orgs in the top 10
    4. Smoke: BASE_URL / and /api/health return 200
    5. Playwright happy path for interview integration test against `BASE_URL`

- [ ] Data is queryable:
    - Ingest: stream + Zod-parse `dataset/charities_10k.jsonl`, skip both-null rows
    - Build `embedding_text` (name included); `content_hash` idempotency
    - Batch-embed via Voyage `voyage-4` (`input_type=document`); upsert; write `output/ingest_report.json` + `failed_records.jsonl` _(per-batch durable upsert + pacing for rate limits)_
    - Verify ingestion: rows + non-null embeddings + corpus >=95%

- [ ] Retrieval baseline:
    - Candidate recall: vector (`<=>`) ∪ trigram name leg; union + dedupe by EIN
    - eval/queries.csv` + `pnpm sanity`: ~10–15 queries printing top results to eyeball, incl. exclusion cases. We care about exclusions!

- [ ] Full pipeline quality:
    - Expand call: philosophy + retrieval queries + exclusion predicates
    - Hard SQL filters: structured + extracted exclusions + geo
    - Voyage `rerank-2.5` on candidate union with deterministic intent line, this is important to improve the quality of matches
    - Diversify & select 10: near-dup dedup + per-cause cap. We want some diversity on the results.
    - Personalize call: why-lines + set summary. It's important to explain the user why a recommendation.
    - Exclusion scrub on final 10 charities.
    - Degradation paths + query embedding/expansion caching
    - Possible endpoints (feel free to adapt): `/api/recommend`, `/api/search`, `/api/health`; Zod input hygiene
    - Spot-check full-pipeline results via the sanity queries:

        Not a metrics harness — just quick confidence that retrieval isn't broken while you build the pipeline. A small script (`pnpm sanity`) runs ~10–15 hand-picked queries against the live pipeline and **prints the top results to eyeball**: e.g. `"red cross"` → American Red Cross near the top, `"help feed hungry families"` → food banks, a cause-area query → that cause, a misspelled query → still sensible. Keep the queries in a tiny `eval/queries.csv` (query + a note on what should appear).

        Include the **exclusion cases**: each exclusion query must return zero forbidden orgs in the top 10. The real end-to-end verification is the three integration scenarios in [`RUBRIC.md`](./RUBRIC.md).

- [ ] MVP live:
    - Interview agent: Full + Quick modes
    - Landing page per design spec
    - Two-panel interview UI: streamed questions, handwritten facet annotations, live scene. See `DESIGN.md`
    - Pipeline-theater loading screen
    - Report sections: philosophy, strategy, portfolios (name, description and recharts with detailed allocations + dollar math), charities with explanations, plan, fund-portfolio, footer CTA to turn into a Daffy fund.
    - Verify `data/daffy_portfolios.json` built (real portfolios + fresh copy + selection rules)
    - Fund-portfolio recommendation: deterministic mapping from `data/daffy_portfolios.json`
    - Progressive/streaming report reveal
    - Deploy; verify's deterministic checks pass against the live URL. This must succeed at this step.

- [ ] Demo-ready polish & delight:
    - Interaction spec items 1–7: streaming text, annotations, scene, theater, reveal, cards. Leverage the `DESIGN.md` spec and the Motion+ MCP for animating the interface with premium animations.
    - Reduced-motion fallbacks
    - Curtains/blinds screen transitions — hand-rolled cream `Blinds` with `motion`. I like those and full screen they will look great.
    - Landing performant; verify everything is still green

- [ ] Differentiators:
    - Free-text fast path _(`/api/search` endpoint; no dedicated search-box UI — interview is the entry)_
    - News grounding _(`/api/news`, progressive, cache-first, concurrency 4)_
    - Voice mode toggle (default OFF): ElevenLabs TTS out + Scribe STT in; text/typed always present _(hands-free auto-listen)_
    - Shareable report URL _(`/api/share` → `reports` slug → `/r/:slug`)_ for viral loops.
    - Richer scene detail. Make sure animated elements are visible, not too small and the page is very visual hierarchical, clean and easy to read.

- [ ] Acceptance criteria:
    - **All of [`RUBRIC.md`](./RUBRIC.md) passes**
    — `pnpm verify` green (with the full 10k corpus)
    - Exclusions respected
    - The three integration scenarios (S1 Maria, S2 The Chens, S3 Sam) **run against the live URL and judged successful**
    - Spot-check things

---

News articles to expand on charities:
```json
{
  "type": "web_search_20250305",
  "name": "web_search",

  // Optional: Limit the number of searches per request
  "max_uses": 5,

  // Optional: Only include results from these domains
  "allowed_domains": ["example.com", "trusteddomain.org"],

  // Optional: Never include results from these domains
  "blocked_domains": ["untrustedsource.com"],

  // Optional: Localize search results
  "user_location": {
    "type": "approximate",
    "city": "San Francisco",
    "region": "California",
    "country": "US",
    "timezone": "America/Los_Angeles"
  }
}
```
More info here: https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool