# Design spec

## Ethos

Minimal and typographically sophisticated. Structure comes from the grid and from type hierarchy — never from boxes, panel borders, or divider lines. If a layout needs a line to read clearly, the spacing is wrong; fix the spacing. Every screen should look composed, like a printed page, with the type doing the work and color appearing only as deliberate accents.

## Typography

Four families, loaded via Google Fonts CDN in `root.tsx` `links()` (self-hosting is a later tweak):

- **Fraunces** (variable, optical sizing on) — display serif for questions, philosophy, headlines, report numerals. **Italic on the one emphasized word per display line** ("know your giving *before* you give") — this is the signature move, one italic word/phrase per line, max.
- **Inter** — body and UI. Body 16/26, card meta 14/20.
- **JetBrains Mono** — meta strip, data labels, dollar figures in the plan. Small-caps tracking +0.08em on the strip.
- **Caveat** — facet annotations and margin notes only. Shipped at 1.5rem / weight 600 for legibility.

**Hierarchy** is expressed only through size, weight, and space — never color changes or boxed backgrounds. Use these levels and only these:

- `display` — Fraunces, weight 380, leading 1.05–1.15, tracking −0.01em. One per screen (question / report H1 / philosophy opening).
- `headline` — Fraunces `clamp(1.4rem, 2vw, 1.8rem)`, weight 500. Report section titles.
- `body` — Inter 16/26, weight 400. `body-strong` (600) inside sentences, sparingly.
- `meta` — JetBrains Mono 12/16, uppercase, tracking +0.08em, muted.

Type scales: question `clamp(1.6rem, 2.6vw, 2.4rem)/1.25` (deliberately smaller than the landing display — the full display scale overflows on real, long questions); philosophy `clamp(1.6rem, 3vw, 2.4rem)/1.3`; report H1 `clamp(2.5rem, 5vw, 4rem)`; landing wordmark `clamp(4rem, 10vw, 9rem)`.

Vertical rhythm on an 8px baseline; leave ≥2 steps between hierarchy levels (48px under a display, 24px under a headline) so the scale reads without rules.

## Shape & depth

Flat by default — no borders or shadows on resting elements. Depth appears only on interaction: hover shadow `0 10px 15px -3px rgb(23 29 44 / 0.08)`. Radius `0.625rem` on inputs/buttons, `1rem` on cards and papers. Hairline rules (1px, hairline token) are allowed only as horizontal separators inside dense lists — never around panels, never as vertical dividers.

The one exception to "no resting depth" is the paper contact shadow (see Paper artifacts): `0 18px 40px -24px rgb(27 26 23 / 0.35)`.

## Layout — one grid, full-screen, no dividers

A single **12-column grid** governs every screen: outer margins `clamp(24px, 5vw, 96px)`, gutter 32px, 8px baseline. Everything sits on it — meta strip, question, input, annotations, scene, report sections, cards. Alignment is what makes the page feel designed.

The app is full-screen, one continuous cream paper field:

- **Interview + loading:** conversation in columns 1–6 (question, input, dense info), the generative scene in columns 8–12. The empty column 7 and the shared field *are* the separation — no line, border, or background change. The scene's ripples may bleed past its columns; that's part of the composition. On mobile the scene becomes a top band (~30vh) above the conversation, again separated by space alone.
- **Report:** document column spans 2–8, the handwritten margin layer lives in 9–10, the scene quiets into the remaining space.

**Sticky meta strip** — always visible, no border. A single mono line on the column grid: wordmark col 1, location/time center, stage + a `● voice` toggle flush right:

```
wordmark · OAKLAND, CA (click to edit) · 10:18 PM · INTERVIEW (2/3) → BUILDING YOUR STRATEGY → YOUR REPORT · ● voice
```

32px of space separates it from content below. Editing the location writes the `geo` facet; on the results page it surfaces an "Update results" affordance that re-runs recommend. The `● voice` toggle defaults OFF (see Voice).

Text should always be visible on screen and not wrap in bad ways.

## The right-panel scene

One continuous generative artwork: concentric, organic, line-drawn growth in the stationery style. Soft radial ripple rings in warm paper grey on the cream field, with a minimal **ink line-drawn motif** at the center that **grows as the interview progresses** — each captured facet adds an element (a leaf, a small node filled with its cause tint, a butter or terracotta dot).

On submit it transitions into the **matching constellation**: hundreds of faint points (the charity universe); as pipeline stages complete, matched points brighten into their cause tints and drift toward center. On the report, the final 10 points settle into a quiet orbital arrangement and the rings slow.

The scene must be large and clearly visible (use large elemnts for the animated ones) — the near-cream rings read as invisible, so use the darker scene greys (`--color-scene-ring: #cdc6b2`, `--color-scene-point: #b8b09a`), make it ≥520px, and give it slow continuous rotation plus spring-in motif/orbital points. Dots must read at vignette scale too: center ~7px, motif ~7–10px, orbital ~13px in a 400 viewBox — not pinpricks. Captions/labels beside it at ≥`--text-meta`.

**Renderer:** SVG/canvas driven by `motion+`. A static final frame is the universal fallback if anything janks.

## Paper artifacts — the report's signature

The metaphor: **your giving plan is a packet of papers the planner slides across the desk.** Landing and interview stay airy ink-on-cream poster pages; the report is where the paper kit appears.

Every paper is a flat, saturated block (butter / terracotta / receipt grey / cream) with generous internal padding, radius `1rem`, a fixed resting rotation between −2.5° and +2.5° (deliberate per paper, not random-on-render), and a single soft contact shadow as the only depth in the app. Papers may overlap and peek like a stack on a desk.

**Stationery details, ≤2 per paper:** a dashed-border stamp holding a number; a circular dashed seal in mono (`REPORT · NO. 0042`); a punched hole; a `TEAR HERE` perforation (1px dashed + tiny scissors glyph); vertical mono micro-type along an edge (URL · date · location, like a ticket's fine print). Flourishes must never crowd out content.

Report sections, as artifacts:

- **Philosophy + strategy** — a letter on cream, typeset like correspondence, hand-drawn underline.
- **Portfolio** — the butter-yellow card: allocation chart + circled total + a stamp with the monthly amount.
- **The plan** — the receipt-grey paper: a clean, useful schedule (intro line + line items, amounts right-aligned). **No `TEAR HERE`, no seal, no faux-receipt decorations** — just the schedule.
- **Charity entries** — typographic on the field (see below), each with a small dashed rank stamp (`Nº 01`).
- **Fund recommendation** — a small terracotta slip.
- **Summary trio** under the report header — the icon-chip pattern: small filled circle (ink/terracotta/butter) with a glyph, serif caption, two mono detail lines (`Your causes` · `Your budget` · `Your cadence`).

**Entrance:** each paper slides up 24px while its rotation settles from 0° to resting (spring, stiffness 260, damping 26), staggered 120ms, on scroll-into-view — the feeling of papers being laid on a desk one by one. Reduced motion: fade in at final angle.

## Animation sourcing & transitions

**Source text animations from the Motion AI Kit — don't invent them.** For every editorial text moment (landing tagline, eyebrow blocks, vignette captions, report headlines, philosophy, stage captions), query the Motion MCP for a matching premium example and adapt its pattern. The values in this spec are defaults; a better-fitting AI Kit pattern at comparable restraint wins.

**Screen transitions = a cream "blinds" wipe** on each stage mount — horizontal bars in `--background` retracting in sequence, ~750ms, revealing the next stage already composed (so the wipe reads as paper, not black). Hand-roll it with `motion` (a `Blinds` component); the token-gated Motion+ package is optional and the hand-rolled version is the default, which keeps the repo installable by anyone. The transition *into the report* should be the most deliberate. `prefers-reduced-motion` → no blinds, 150ms crossfade.

**Motion AI Kit install (one-time):** `npx motion-ai` — prompts for a Motion API key (motion.dev/dashboard/tokens, Motion+ required), project-vs-global, and which agent to wire up (pick **Claude Code**), then configures the Motion MCP server + the `/motion` skill. The skill carries the Motion team's best practices (e.g. animate via `transform` for hardware acceleration). Configure `.npmrc` to read `MOTION_TOKEN` from env — never commit the token; README documents that the blinds transition needs Motion+ and that the app falls back gracefully without it.

## Interaction spec

**1. Landing — an editorial poster, not a hero section.** Composition on the 12-col grid, generous white field, content staggered asymmetrically down the page:

- Top: the **wordmark huge** (display serif, weight 600) with a small terracotta square (~0.12em) at its baseline as the single brand mark. Flush-right on the same line: a dot + mono `● begin` jumping to the footer CTA.
- Below, offset right of column 1: the tagline at display scale, lowercase, light weight (e.g. `Philanthropic plans into action for everyone.`), rising in on load.
- Scattered across the grid where a photo essay would sit: **3–4 scene vignettes** — small live canvases (~280–420px, varied, deliberately misaligned like pinned prints), each rendering one study from the scene system (idling ripple rings · a constellation fragment · the growing motif · a settled orbital ring) with a dot + mono lowercase caption (`● the interview` · `● thousands of charities` rendering the real row count when available · `● your portfolio`). Vignettes idle ≤30fps, pause off-viewport, pointer displaces the nearest element ≤6px.
- Staggered between them: the explainer trio in the eyebrow pattern (terracotta dot + mono uppercase label + 3–4 body lines) — `● WHAT IT IS` · `● HOW IT WORKS` · `● WHERE IT LEADS` — each in a different column band so the page reads diagonally.
- Footer: a giant lowercase **`begin →`** (display scale, arrow in terracotta, nudges 6px right on hover) starting the full interview, with `● quick — 3 questions` in mono beside it (`?mode=quick`). Far right, a mono colophon (data source, event, builder). Hover: 160ms lift; press: `scale(0.985)`.
- Scroll is allowed here (the only scrolling screen besides the report): vignettes and text blocks fade + rise 12px as they enter, once.

**2. Interview turn cycle.** The question streams in **word-by-word as tokens arrive** via a Motion stagger pattern (a `WordStream` component using `staggerChildren` — *not* CSS `animation-delay`, which doesn't re-trigger): each word fades + rises 6px + un-blurs, min 30ms gap so fast streams stay legible. It must visibly "type" in. On submit, use `AnimatePresence` (`mode="wait"`): the question exits (fade + blur + rise) → a `ThinkingDots` pulse while the agent thinks → the next question `WordStream`s in. The input has a 1px ink underline that thickens to 2px on focus (no boxed ring); while the agent thinks the underline breathes (2.4s sine).

**3. Facet annotations — the money shot.** Each captured facet writes itself into the margin in Caveat: animated `stroke-dashoffset` underline + 350ms text fade, a small ✓ that draws in (250ms), and a doodle glyph per type (pin = geo, heart = values, $ = budget, ✕ = exclusion). Must appear within ~1s of the answer that produced it. Simultaneously the scene gains its element (400ms spring, stiffness 300, damping 24). Never show facets the user didn't give.

**4. Loading — pipeline theater.** Left panel cycles stage captions in mono, crossfade ~3.8s each so it feels calm, not flickery: `READING YOUR PHILOSOPHY` → `SEARCHING THOUSANDS OF CHARITIES` (real count when available) → `CHECKING WHAT THEY'RE DOING NOW` → `WRITING YOUR STRATEGY`. Right panel runs the constellation. No bare spinner anywhere, ever.

**5. Report reveal — progressive, in this order:**
1. Philosophy streams at display scale, with the user's key facet words as **inline highlight chips** (cause-tinted pills, 2px radius padding, animating in 200ms after their word lands).
2. Hand-drawn underline draws beneath it (600ms).
3. Strategy sections cascade (80ms stagger).
4. Portfolio chart draws its arcs (800ms, anticlockwise); the hand-drawn circle wobbles in around the total.
5. Charity cards stagger-rise (60ms steps, cap 360ms).
6. News lines hydrate last, shimmer→text swap as each resolves.

**6. Charity entries — typographic, not boxy.** Each is a composed block on the grid: a small dashed rank stamp (`Nº 01`) + mono metadata (`OAKLAND, CA`) · serif name at headline scale · why-line in body · news line with source link in meta — with a short **cause-tinted rule** (3px, ~48px wide) above the metadata as the only color accent. Entries separated by 48px whitespace (a single hairline in dense lists). The whole entry is clickable: hover raises it 3px and extends the cause rule to full text width (200ms); press compresses. `Give on Daffy →` is the action, set in body-strong with an arrow, not a filled button. Single column ≤768px, two above.

**7. Philosophy card actions.** Edit swaps to an inline textarea (height auto-animates); Regenerate crossfades old→new text with highlights re-detecting. Saved/edited state never loses the recommendations below.

**8. Meta-strip location edit.** Click → inline free-text input; on commit the geo margin note rewrites itself; on the results page an `Update results` pill slides in beside it and re-runs recommend on click (results crossfade, scroll position preserved).

**9. Reduced motion (`prefers-reduced-motion`).** Every animation — including the blinds — collapses to a ≤150ms opacity fade; write-on effects render their final state; the scene renders its static final frame; streaming text appears sentence-at-once.

**10. Performance.** Animate only `transform`/`opacity`; pause the scene when the tab is hidden; target 60fps on a mid-range laptop; if a scene effect janks or delays a P0, ship the static fallback and move on.

**11. Voice — hands-free, not click-to-record.** When voice is on, the agent speaks the question, then the mic **auto-starts** and **silence-detection (VAD) ends the turn** — the user just talks and pauses; the clip is transcribed (Scribe) and sent automatically. No start/stop clicks. Show a "Listening…" placeholder + a pulsing pill ("listening… tap to send now") with a manual tap-to-send fallback. (Scribe is batch, so there's no live interim text — auto-stop-on-silence is the UX.)

## The footer — "Make it real on Daffy"

A large section, not a single link. It pitches the Daffy donor-advised fund in daffy.org's framing: contribute once (cash / stock / crypto) → tax deduction now → grant to 1.5M+ charities anytime; **flat $3/mo Contributor membership** (a fixed fee, not an asset %); **17 tax-free expert portfolios**; recurring gifts, stock & crypto donations, mobile app, family/advisor accounts; and **how it fits** ("the causes above are your giving portfolio; the fund grows tax-free until you give it away"). Big Daffy-green **"Create your Daffy account →"** CTA. Share + upsell are secondary, below it.

## Tokens

Define as CSS variables in the Tailwind v4 theme; use only these.

**Field & ink:**
- `--background: #F4F0E5` (warm cream paper) · `--foreground: #1B1A17` (soft black ink)
- `--color-muted: #565145` (readable on cream — the lighter `#6E6A5E` is too low-contrast for placeholders and the strip)
- hairlines `#DDD8C9`

**Paper tones** — the only surface colors; every card is a piece of paper, a flat fully-saturated block, never a tint or wash:
- butter yellow `#F5B81F` (ink on it: `#1B1A17`)
- terracotta `#C7552B` (ink on it: cream)
- receipt grey `#D9D6CB`
- plain cream (the field itself)

**Daffy green `#3D7252`** — reserved exclusively for Daffy actions (`Give on Daffy →`, `Make it real on Daffy`, the portfolios link). Green = "this becomes real." Nothing else is green.

**Cause tints** — small doses only (chart segments, caption dot markers, inline philosophy highlight chips): health `#f39e9e` · human rights `#ffb2e0` · education `#c6adf8` · justice `#a1b0e0` · research `#a0c4de` · environment `#a4dd9f` · arts `#c8d18e` · animals `#d1ae94` · food `#fec398` · faith `#f3e9aa` · fallback `#DDD8C9`. Map dataset `cause` slugs to the nearest bucket once, in one file.

**Scene greys:** `--color-scene-ring: #cdc6b2` · `--color-scene-point: #b8b09a`.

**Hand-drawn ink:** `#1B1A17` (cream on terracotta/dark surfaces). **Errors:** a quiet deep red `oklch(0.444 0.177 26.9)`, sparingly, set fairly large so it's easy to read.

No gradients, no glassmorphism, no shadows except the paper contact shadow. Color appears only as: paper blocks, cause-tint doses, Daffy-green actions, ink.

**SVG/chart fills must use literal hex, never CSS variables** — recharts `<Cell fill>` and SVG `<circle fill>` render *black* when given `var(--color-tint-*)`. Keep one hex map (`causeColor()`) mirroring the tokens and use it for all fills. Portfolio fonts are body-size (not small mono); include a **"composition by cause"** breakdown (cause → %) with a one-line intro on how the budget divides.