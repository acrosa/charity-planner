import { z } from "zod";
import { structured } from "../lib/anthropic";
import {
  emptyFacets,
  type FacetAnnotation,
  type Facets,
  FacetsSchema,
  newAnnotations,
} from "../lib/facets";

// The interview agent: one warm question per turn, extracts facets from the
// user's free text, decides the next question or to finish. Hard rules
// (RUBRIC S1/S2/S3): never fabricate an unstated facet, never re-ask an answered
// one, exit gracefully when the user disengages, and keep Quick mode to 3 turns.

export type InterviewMode = "quick" | "full";

export interface TurnInput {
  mode: InterviewMode;
  history: { role: "agent" | "user"; text: string }[];
  facets: Facets;
}

export interface TurnResult {
  facets: Facets;
  nextQuestion: string | null;
  done: boolean;
  stage: string;
  newAnnotations: FacetAnnotation[];
}

// Mode-aware turn caps. Quick = 3 user answers. Full ≤ ~11 user answers so the
// agent stays under the 12-turn cap (RUBRIC S2) including the opener.
const QUICK_USER_TURNS = 3;
const FULL_USER_TURNS = 11;

export const OPENING_QUESTION =
  "What pulls at you? Tell me about a cause — or a moment — that makes you want to give.";

// Controlled cause vocabulary = the dataset's cause slugs, so captured causes
// map cleanly to tints and retrieval queries.
const CAUSE_VOCAB = [
  "healthcare",
  "mental-health",
  "education",
  "youth",
  "food-nutrition",
  "homelessness-housing",
  "human-services",
  "environment",
  "animals",
  "arts-culture",
  "science-tech",
  "criminal-justice",
  "social-advocacy",
  "employment",
  "community",
  "international",
  "disaster-relief",
  "religion",
  "sports",
].join(", ");

const TurnOutputSchema = z.object({
  facets: FacetsSchema,
  done: z.boolean(),
  nextQuestion: z.string().nullable(),
  stage: z.string(),
});

function systemPrompt(mode: InterviewMode): string {
  const turnRule =
    mode === "quick"
      ? `This is QUICK mode: ask at most ${QUICK_USER_TURNS} questions total. After the user's ${QUICK_USER_TURNS}rd answer, set done=true. Cover the essentials fast: (1) their values/causes and any place they care about, (2) anything they want to avoid, (3) how much and how they want to give (concentrate vs. spread).`
      : `This is FULL mode: be thorough but efficient. Across the conversation, try to learn: causes, location/scope, exclusions (things to avoid), risk appetite (proven vs. newer approaches), incremental vs. systemic change, whether they want evidence of impact, budget + cadence, whether they want a discretionary reserve, time horizon, and concentrate-vs-broaden strategy. Ask ONE thing per turn. NEVER re-ask something already captured. Stop (done=true) once you have enough — ideally within 8 questions, and NEVER exceed ${FULL_USER_TURNS} questions.`;

  return `You are a warm, sharp philanthropic advisor conducting a short interview. You speak like a thoughtful person, not a form. One question per turn, conversational, building on what they said.

${turnRule}

OUTPUT: call the \`interview_turn\` tool with the COMPLETE updated facets object (merge what you already knew with what this answer revealed), whether you are done, the next question (null if done), and a short stage label.

CAPTURING FACETS — extract ONLY what the user actually said. This is critical:
- NEVER invent or assume a facet the user did not state. Unstated facets MUST stay null/empty. Do not guess a budget, a location, a strategy, or causes they didn't mention.
- causes: choose slugs from this list when they fit: ${CAUSE_VOCAB}. Map natural language (e.g. "hunger"→food-nutrition, "helping kids learn"→education, "wildlife"→animals, "climate"→environment, "scientific research"→science-tech).
- geo: if they name a place, fill raw + the 2-letter US state (uppercase) + city when clear, and set scope (local/regional/national/global). "Oakland"→{raw:"Oakland",city:"Oakland",state:"CA",scope:"local"}. "global"/"anywhere in the world"→scope:"global".
- exclusions.tags: use ONLY these when explicitly excluded: political_advocacy ("nothing political"), religious ("no religious orgs"), international, hospitals, universities. exclusions.freeText: any other "avoid X" phrase verbatim (e.g. "nothing affiliated with Stanford").
- budget: amount (number) + cadence (monthly/annual/one_time). "$100 a month"→{amount:100,cadence:"monthly"}.
- strategy: concentrate ("a handful I believe in", "not spread thin"), broaden ("spread it widely"), broaden_then_focus ("explore then concentrate").
- risk: proven (established, evidence-backed), balanced, experimental ("newer approaches OK", "fund risky bets").
- change: incremental or systemic ("address root causes").
- outcomes: wants_evidence ("show me impact/evidence") or flexible.
- horizon: year_by_year ("give as I go"), multi_year, lifetime, legacy.
- discretionaryReserve: true if they want to hold some back for spontaneous giving.
- crypto: set crypto.mentioned=true and coin ONLY if they explicitly bring up crypto/Bitcoin/Ethereum/etc. Never otherwise.

DISENGAGEMENT — if the user says "skip", "don't know", "just show me", "whatever", or is clearly done answering, do NOT badger them. Capture only what little they gave and set done=true immediately with a kind, brief close. This matters: a terse user should reach the report fast.

TONE for questions: brief, human, specific to their last answer. No pill grids, no "step 2 of 5". One question. Reference their own words.`;
}

function renderHistory(history: TurnInput["history"]): string {
  if (history.length === 0) return "(no messages yet)";
  return history.map((m) => `${m.role === "agent" ? "ADVISOR" : "DONOR"}: ${m.text}`).join("\n");
}

export async function runInterviewTurn(input: TurnInput): Promise<TurnResult> {
  const prev = FacetsSchema.parse(input.facets ?? {});
  const userTurns = input.history.filter((m) => m.role === "user").length;
  const cap = input.mode === "quick" ? QUICK_USER_TURNS : FULL_USER_TURNS;

  const prompt = `Conversation so far:\n${renderHistory(input.history)}\n\nFacets captured so far:\n${JSON.stringify(prev)}\n\nThe donor has answered ${userTurns} question(s) (cap ${cap}). Update the facets from their latest answer, then either ask the next question or finish.`;

  const out = await structured({
    system: systemPrompt(input.mode),
    prompt,
    schema: TurnOutputSchema,
    toolName: "interview_turn",
    toolDescription: "Record updated facets and decide the next question or to finish.",
    maxTokens: 1500,
    effort: "medium",
  });

  // Degradation: if the model reply doesn't validate, keep prior facets and end
  // gracefully rather than throwing to the user.
  if (!out) {
    return {
      facets: prev,
      nextQuestion: null,
      done: true,
      stage: "wrapping up",
      newAnnotations: [],
    };
  }

  // Server-side guards the model can't override: enforce the turn cap.
  const reachedCap = userTurns >= cap;
  const done = out.done || reachedCap;

  return {
    facets: out.facets,
    nextQuestion: done ? null : out.nextQuestion,
    done,
    stage: out.stage || (done ? "building your strategy" : "interview"),
    newAnnotations: newAnnotations(prev, out.facets),
  };
}

export { emptyFacets };
