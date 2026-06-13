import { randomBytes } from "node:crypto";
import { getDb, schema, withDbRetry } from "../db/client";
import type { Route } from "./+types/api.share";

// Shareable report URLs (BRIEF.md differentiator). Stores the report payload
// under a short slug; /r/:slug renders it. Viral-loop entry point.
function makeSlug(): string {
  return randomBytes(6).toString("base64url"); // ~8 chars, url-safe
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "method not allowed" }, { status: 405 });
  }
  let body: { report?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.report || typeof body.report !== "object") {
    return Response.json({ error: "missing report" }, { status: 400 });
  }

  try {
    const slug = makeSlug();
    await withDbRetry(() =>
      getDb()
        .insert(schema.reports)
        .values({ slug, payload: body.report as object }),
    );
    return Response.json({ slug, url: `/r/${slug}` });
  } catch (err) {
    console.error("[api.share] error:", err);
    return Response.json({ error: "failed to save" }, { status: 500 });
  }
}
