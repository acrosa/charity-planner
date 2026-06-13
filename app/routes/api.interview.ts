import { z } from "zod";
import { FacetsSchema } from "../lib/facets";
import { OPENING_QUESTION, runInterviewTurn } from "../llm/interview";
import type { Route } from "./+types/api.interview";

const RequestSchema = z.object({
  mode: z.enum(["quick", "full"]).default("quick"),
  history: z.array(z.object({ role: z.enum(["agent", "user"]), text: z.string() })).default([]),
  facets: FacetsSchema.optional(),
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

  const { mode, history } = parsed.data;
  const facets = parsed.data.facets ?? FacetsSchema.parse({});

  // Turn 0: no history yet → return the opening question without an LLM call.
  if (history.length === 0) {
    return Response.json({
      facets,
      nextQuestion: OPENING_QUESTION,
      done: false,
      stage: "interview",
      newAnnotations: [],
    });
  }

  try {
    const result = await runInterviewTurn({ mode, history, facets });
    return Response.json(result);
  } catch (err) {
    console.error("[api.interview] error:", err);
    // Degrade: end the interview rather than throwing to the user.
    return Response.json({
      facets,
      nextQuestion: null,
      done: true,
      stage: "building your strategy",
      newAnnotations: [],
    });
  }
}
