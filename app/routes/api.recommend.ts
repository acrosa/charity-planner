import { z } from "zod";
import { FacetsSchema } from "../lib/facets";
import { generateReport } from "../pipeline/recommend";
import type { Route } from "./+types/api.recommend";

const RequestSchema = z.object({
  facets: FacetsSchema,
  mode: z.enum(["quick", "full"]).default("quick"),
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
    const report = await generateReport(parsed.data.facets, parsed.data.mode);
    return Response.json({ report });
  } catch (err) {
    console.error("[api.recommend] error:", err);
    return Response.json({ error: "failed to generate report" }, { status: 500 });
  }
}
