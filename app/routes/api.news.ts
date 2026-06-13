import { z } from "zod";
import { fetchNewsBatch } from "../llm/news";
import type { Route } from "./+types/api.news";

// Progressive news grounding (BRIEF.md differentiator). Client calls this after
// the report renders; results shimmer→text in. Concurrency-capped at 4.
const RequestSchema = z.object({
  charities: z
    .array(
      z.object({
        ein: z.string(),
        name: z.string(),
        city: z.string().nullish(),
        state: z.string().nullish(),
      }),
    )
    .min(1)
    .max(12),
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
    const news = await fetchNewsBatch(parsed.data.charities, 4);
    return Response.json({ news });
  } catch (err) {
    console.error("[api.news] error:", err);
    // News is a progressive enhancement — return empty rather than failing.
    return Response.json({ news: {} });
  }
}
