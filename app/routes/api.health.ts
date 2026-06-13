import type { Route } from "./+types/api.health";

// Resource route — the deploy smoke check (RUBRIC.md §1) asserts this returns
// 200. Keep it dependency-free so a DB outage never fails the liveness probe.
export function loader(_args: Route.LoaderArgs) {
  return Response.json({
    status: "ok",
    service: "charity-planner",
    time: new Date().toISOString(),
  });
}
