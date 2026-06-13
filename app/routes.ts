import { index, type RouteConfig, route } from "@react-router/dev/routes";

// Routes grow here as features land (interview, report, /r/:slug share pages,
// /api/recommend, /api/search, /api/news, /api/share). For the skeleton we ship
// the landing page and the health check the deploy smoke test depends on.
export default [
  index("routes/home.tsx"),
  route("api/health", "routes/api.health.ts"),
] satisfies RouteConfig;
