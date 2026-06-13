import { eq } from "drizzle-orm";
import { Report as ReportView } from "../components/report/Report";
import { getDb, schema, withDbRetry } from "../db/client";
import type { Report as ReportType } from "../lib/types";
import type { Route } from "./+types/r.$slug";

// Shareable report page. Loads the stored payload by slug and renders it
// read-only (news is whatever was captured when shared).
export async function loader({ params }: Route.LoaderArgs) {
  const slug = params.slug;
  const rows = await withDbRetry(() =>
    getDb().select().from(schema.reports).where(eq(schema.reports.slug, slug)).limit(1),
  );
  if (rows.length === 0) {
    throw new Response("Not found", { status: 404 });
  }
  return { report: rows[0].payload as ReportType };
}

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "A giving plan · Charity Planner" },
    { name: "description", content: "A personalized giving plan made with Charity Planner." },
  ];
}

export default function SharedReport({ loaderData }: Route.ComponentProps) {
  return (
    <main className="min-h-screen">
      <header className="px-[clamp(24px,5vw,96px)] pt-6 pb-2">
        <a
          href="/"
          className="font-mono text-[12px] uppercase tracking-[0.08em] text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
        >
          charity planner · make your own →
        </a>
      </header>
      <ReportView report={loaderData.report} />
    </main>
  );
}
