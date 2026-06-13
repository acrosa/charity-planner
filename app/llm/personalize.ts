import { z } from "zod";
import { structured } from "../lib/anthropic";
import type { Facets } from "../lib/facets";

// "Personalize" step: writes the report's prose — philosophy, three strategy
// section bodies, plan intro, and a why-line per charity. Everything is grounded
// ONLY in facets the donor actually gave (RUBRIC: no invented preferences), and
// the why-lines connect to the donor's own words rather than generic praise.

export interface PersonalizeCharity {
  ein: string;
  name: string;
  mission: string | null;
  cause: string | null;
  city: string | null;
  state: string | null;
  role: "anchor" | "explorer" | "core";
  funded: boolean;
}

export interface PersonalizeInput {
  facets: Facets;
  charities: PersonalizeCharity[];
  hasConcreteBudget: boolean;
  hasReserve: boolean;
}

const PersonalizeSchema = z.object({
  philosophy: z.string(),
  highlightTerms: z.array(z.string()).max(8),
  summary: z.object({
    causes: z.string(),
    budget: z.string(),
    cadence: z.string(),
  }),
  approachBody: z.string(),
  riskImpactBody: z.string(),
  budgetHorizonBody: z.string(),
  planIntro: z.string(),
  whyLines: z.array(z.object({ ein: z.string(), why: z.string() })),
});

export type PersonalizeResult = z.infer<typeof PersonalizeSchema>;

const SYSTEM = `You are a philanthropic planner writing a donor's personalized giving report. Warm, precise, first-person ("you"/"your"), never salesy. Call the \`personalize\` tool.

THE MOST IMPORTANT RULE: ground everything ONLY in what the donor actually told you. NEVER invent a preference, motivation, place, or value they did not state. If they told you little, write little — sincerely — rather than padding with assumptions. A donor who only said "animals" must not be described as caring about, say, endangered species in Africa unless they said so.

HONOR EXCLUSIONS SILENTLY: never name or mention a specific organization, school, company, or entity the donor asked to avoid. If they said "nothing affiliated with Stanford", do NOT write the word Stanford anywhere — just quietly steer the plan elsewhere.

Fields:
- philosophy: 2–4 sentences in the donor's own framing, echoing their actual words and reasons. If they shared a personal story, reflect it. If they said almost nothing, keep it short and honest (a sentence or two) — still sincere, never generic filler.
- highlightTerms: 3–6 of the donor's KEY words/phrases that appear in your philosophy text verbatim (these get highlighted). Use words the donor actually used or that name their stated causes.
- summary: three tiny labels — causes (their cause areas in plain words), budget (e.g. "$100/month", or "Amount open" if none given), cadence (e.g. "Monthly", or "Up to you" if none given).
- approachBody: 1–2 sentences on how they'll give (concentrate vs. broaden) reflecting their stated strategy. If unstated, briefly explain the sensible default you've used.
- riskImpactBody: 1–2 sentences reflecting their stated risk appetite, appetite for systemic vs. incremental change, and whether they want evidence of impact. Reflect their ACTUAL words (e.g. "you're open to newer approaches and want some evidence they're working") — not boilerplate. If unstated, say so plainly and give the default.
- budgetHorizonBody: 1–2 sentences on budget, any discretionary reserve, and time horizon. If the budget is unknown, use constructive gap framing — explain that the plan works as proportional shares of whatever they choose to give, and they can set an amount anytime. Never scold them for not answering.
- planIntro: one sentence introducing the monthly giving schedule.
- whyLines: EXACTLY one entry per charity (match by ein). Each is ONE sentence, ≤ 28 words, explaining why THIS org fits THIS donor, connecting to their stated causes/place/values. Make at least the funded ones specific to the donor's story, not generic praise. Never claim the donor cares about something they didn't say.`;

function degrade(input: PersonalizeInput): PersonalizeResult {
  const causes = input.facets.causes.join(", ") || "the causes you named";
  return {
    philosophy: `Here is a giving plan shaped around ${causes}.`,
    highlightTerms: input.facets.causes.slice(0, 4),
    summary: {
      causes: causes,
      budget: input.facets.budget.amount ? `$${input.facets.budget.amount}` : "Amount open",
      cadence: input.facets.budget.cadence ?? "Up to you",
    },
    approachBody: "We've spread your giving across a researched shortlist.",
    riskImpactBody: "We focused on established, well-regarded organizations.",
    budgetHorizonBody: input.hasConcreteBudget
      ? "Your budget divides across the portfolio below."
      : "These are shares of whatever you choose to give — the proportions hold at any amount.",
    planIntro: "Here's a simple monthly schedule.",
    whyLines: input.charities.map((c) => ({
      ein: c.ein,
      why: `${c.name} fits the causes you described.`,
    })),
  };
}

export async function personalize(input: PersonalizeInput): Promise<PersonalizeResult> {
  const charityLines = input.charities
    .map(
      (c, i) =>
        `${i + 1}. ein=${c.ein} | ${c.name} | cause=${c.cause ?? "?"} | ${[c.city, c.state].filter(Boolean).join(", ")} | role=${c.role}${c.funded ? " (funded)" : ""}\n   mission: ${(c.mission ?? "").slice(0, 240)}`,
    )
    .join("\n");

  const prompt = `Donor facets (only use what's here — null means they did NOT say it):\n${JSON.stringify(input.facets, null, 2)}\n\nBudget is ${input.hasConcreteBudget ? "specified" : "NOT specified"}. Discretionary reserve: ${input.hasReserve ? "yes" : "no"}.\n\nThe ${input.charities.length} recommended charities:\n${charityLines}\n\nWrite the report prose. One why-line per charity, matched by ein.`;

  const out = await structured({
    system: SYSTEM,
    prompt,
    schema: PersonalizeSchema,
    toolName: "personalize",
    maxTokens: 3000,
    effort: "medium",
  });
  if (!out) return degrade(input);

  // Ensure every charity has a why-line (fill any the model missed).
  const byEin = new Map(out.whyLines.map((w) => [w.ein, w.why]));
  out.whyLines = input.charities.map((c) => ({
    ein: c.ein,
    why: byEin.get(c.ein) ?? `${c.name} fits the causes you described.`,
  }));
  return out;
}
