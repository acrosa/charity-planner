import { z } from "zod";
import { structured } from "../lib/anthropic";
import type { Facets } from "../lib/facets";

// "Expand" step: turn the donor's facets into 3–6 semantic retrieval queries and
// any free-text exclusion predicates (e.g. "Stanford"). The philosophy + why-lines
// are written later in personalize.ts, once we know the actual charities.

const ExpandSchema = z.object({
  retrievalQueries: z.array(z.string()).min(1).max(6),
  exclusionPredicates: z.array(z.string()).max(8),
});

export interface ExpandResult {
  retrievalQueries: string[];
  exclusionPredicates: string[];
}

const SYSTEM = `You translate a donor's giving preferences into search material for a charity database. Call the \`expand\` tool.

- retrievalQueries: 3–6 short, distinct semantic search phrases that will surface the kinds of organizations this donor wants to fund. Base them ONLY on the causes and values the donor actually expressed. Make them concrete (e.g. "food bank hunger relief for families", "after-school education programs for low-income kids", "wildlife conservation and habitat protection"). Do not include exclusions in the queries.
- exclusionPredicates: short keyword phrases to filter OUT, extracted from anything the donor said to avoid. For a free-text exclusion like "nothing affiliated with Stanford", return ["Stanford"]. For "no religious organizations", you may return ["church","ministry"] but the structured tag already handles that, so focus on proper nouns and specifics the tags miss. Return [] if there are none.`;

function degradeQueries(facets: Facets): string[] {
  if (facets.causes.length) return facets.causes.map((c) => c.replace(/-/g, " "));
  return ["effective charities serving people in need"];
}

export async function expand(facets: Facets): Promise<ExpandResult> {
  const prompt = `Donor facets:\n${JSON.stringify(facets, null, 2)}\n\nProduce retrieval queries and exclusion predicates.`;
  const out = await structured({
    system: SYSTEM,
    prompt,
    schema: ExpandSchema,
    toolName: "expand",
    maxTokens: 600,
    effort: "low",
  });
  if (!out) {
    return { retrievalQueries: degradeQueries(facets), exclusionPredicates: [] };
  }
  return out;
}
