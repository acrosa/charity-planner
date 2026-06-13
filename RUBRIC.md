# RUBRIC.md — Charity planner

How we get confidence the app works **end-to-end**. The core is a small set of **integration tests** — three persona scripts run against the deployed URL (Playwright for mechanical assertions, a quick human/agent eyeball for copy and feel) — plus the automated `pnpm verify` checks and a light retrieval sanity check. Aligned with `BRIEF.md`; keep it simple.

**Principle:** gate only on behavior that must *always* hold (sections render, dollar sums are exact, excluded orgs never appear, the live URL works). *Report* quality metrics (retrieval scores) without failing the build on a soft number.

---

## 1. Automated — `pnpm verify`

- `typecheck` + `biome check` + `vitest run` pass. The one unit test that matters: the **portfolio allocation sums** — the only piece with real arithmetic that must total the budget exactly.
- **Ingest:** `dataset/charities_10k.jsonl` loaded with non-null embeddings (~9.5k after both-null skips).
- **No-leak:** run a few exclusion queries — a structurally-excluded org in the top 10 fails the build.
- **Smoke:** deployed URL returns 200 on `/` and `/api/health`. Basically that Fly.io deployment worked.
- **Playwright happy path** passes.

## 2. Retrieval sanity
- A small script (`pnpm sanity` or similar) runs ~10 hand-picked queries and prints the top results so we can eyeball that the obviously-right orgs surface (e.g. "red cross" → American Red Cross near the top, "help feed hungry families" → food banks).

## 3. Integration test scenarios

**This is the last step before the job can be marked complete.** The agent must run all three scenarios against the live deployed app, check every assertion, and **judge each scenario as successful** — the `[eye]` (copy/feel) checks included, not just the `[PW]` mechanical ones. If any scenario fails or an assertion can't be confirmed, **the job is not done** — fix and re-run. Only when all three pass end-to-end is the project complete.

## 4. Interviews to test for verification end-to-end

### S1 · "Maria" — Quick mode
User turns (verbatim):
1. *"I grew up in Oakland relying on the local food bank, and now that I'm earning well I want to give back to families like mine — food, housing, and helping kids get a fair start."*
2. *"Mostly hunger and education. Please nothing political."*
3. *"Around $100 a month, and I'd rather support a handful of places I really believe in than spread it thin."*

Assert:
- Facets: `causes` ⊇ {hunger, education}; `geo` = local/Oakland/CA; `exclusions` ⊇ political_advocacy; `budget` = $100/monthly; `strategy` = concentrate; unasked facets null (never fabricated). `[PW on facet payload]`
- Report renders all sections `[PW]`; ≥7 of 10 charities are hunger/education/housing/youth-related and ≥2 are CA orgs `[eye]`; **zero political-advocacy orgs anywhere** `[PW: assert known org-type absent]`.
- Portfolio = top 3 at $50/$30/$20, summing to exactly $100/mo `[PW]`.
- Philosophy is first-person and references her own terms (food/community); ≥2 why-lines connect to her story, not generic praise `[eye]`.
- Whole run landing → report feels fast enough for a ~60s screen recording `[eye]`.

### S2 · "The Chens" — Full mode (the complete experience)
Persona: climate + kids' future; causes environment + scientific research; global; **structured exclusion: religious orgs**; **free-text exclusion: "nothing affiliated with Stanford, my husband works there"**; risk: newer approaches OK; change: systemic; outcomes: wants some evidence; budget $500/mo + discretionary reserve yes; horizon multi-year; strategy broaden-then-focus.

Assert:
- Every stated facet lands in the structured object; the interview never re-asks an answered facet; ≤12 agent turns `[PW on transcript]`.
- **HARD (must-have):** zero **religious** orgs in the report (structured exclusion).
- **Stretch:** the word **"Stanford" appears nowhere** in the report — the free-text exclusion honored via the §6.1c extracted predicate + §6.7 scrub. This is the ambitious correctness bet; structured exclusions are the must, free-text is the reach `[PW: assert absent in DOM]`.
- Strategy's Risk & Impact section reflects "newer approaches + some evidence," not boilerplate `[eye]`.
- Portfolio: dollar amounts **sum to exactly $500/mo** `[PW]` (the exact split — 15% reserve, 2×25% anchors, 5×10% explorers — is covered by the §1 allocation unit test, not re-asserted in the browser); plan states a concrete monthly schedule `[eye]`.

### S3 · "Sam" — terse skipper (gap handling)
User turns: 1. *"animals i guess"*  2. *"skip"*  3. *"don't know, just show me"*

Assert:
- Interview exits gracefully well under the turn cap without badgering; `causes` = [animals], everything else null `[PW on transcript]`.
- Report still renders ALL sections `[PW]`; philosophy is short but sincere (no invented preferences) `[eye]`; Budget & Time Horizon uses the constructive gap framing and the portfolio shows percentages with the "shares of whatever you give" copy `[PW: assert copy present]`; all 10 charities are animal/wildlife-related and no why-line claims anything Sam didn't say `[eye]`.

## 4. Simple spot-checks (eyeball once, across the scenarios)

- **Conversational, not a form:** one question per turn, no pill grids/step counters beyond the meta-strip stage; handwritten facet notes write in ~1s after the answer and only for facets the user gave.
- **No bare spinner:** the loading stage is the pipeline-theater scene; stage changes use the blinds transition (or its crossfade fallback).
- **Report = paper kit (§3.1):** sections present as flat paper blocks at slight angles with the single contact shadow; **Daffy green appears only on Daffy actions**; every charity's `Give on Daffy →` link resolves.
- **Fund-portfolio block (P1, when shown):** names a real Daffy portfolio; respects the deterministic rules — **Crypto never unless the user explicitly mentioned crypto**, ESG only on a sustainability signal, Custom for highly specific prefs; the not-investment-advice disclaimer renders; omitted cleanly when uncertain.
- **Reduced motion:** with `prefers-reduced-motion`, animations collapse to fades and the page still completes.
