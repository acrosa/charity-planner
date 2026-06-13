import { z } from "zod";
import { emptyFacets } from "../lib/facets";
import { buildExclusionPlan } from "../pipeline/exclusions";
import { recall, rerankCandidates, selectFinal } from "../pipeline/retrieval";
import type { Route } from "./+types/api.search";

// Free-text fast path (BRIEF.md differentiator): query → ranked charities, no
// LLM, no interview. Useful for the sanity script and a direct search entry.
const RequestSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(25).default(10),
});

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "method not allowed" }, { status: 405 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const facets = emptyFacets();
    const plan = buildExclusionPlan(facets);
    const candidates = await recall([parsed.data.query], plan);
    const ranked = await rerankCandidates(parsed.data.query, candidates);
    const top = selectFinal(ranked, { facets, plan, n: parsed.data.limit });
    return Response.json({
      query: parsed.data.query,
      results: top.map((c, i) => ({
        rank: i + 1,
        ein: c.ein,
        name: c.name,
        cause: c.cause,
        city: c.city,
        state: c.state,
        score: c.rerankScore ?? c.vecScore,
        daffyUrl: `https://www.daffy.org/charities/${c.ein}`,
      })),
    });
  } catch (err) {
    console.error("[api.search] error:", err);
    return Response.json({ error: "search failed" }, { status: 500 });
  }
}
