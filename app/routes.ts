import { index, type RouteConfig, route } from "@react-router/dev/routes";

// Routes grow here as features land. The report + share pages (/r/:slug) wire up
// with the frontend. API resource routes back the interview and pipeline.
export default [
  index("routes/home.tsx"),
  route("plan", "routes/plan.tsx"),
  route("api/health", "routes/api.health.ts"),
  route("api/interview", "routes/api.interview.ts"),
  route("api/recommend", "routes/api.recommend.ts"),
  route("api/search", "routes/api.search.ts"),
  route("api/news", "routes/api.news.ts"),
  route("api/share", "routes/api.share.ts"),
  route("api/tts", "routes/api.tts.ts"),
  route("api/stt", "routes/api.stt.ts"),
  route("r/:slug", "routes/r.$slug.tsx"),
  // How-it-was-made scrapbook (from the scrapbook branch). /did is the short alias.
  route("did", "routes/how-it-was-made.tsx", { id: "did" }),
  route("how-it-was-made", "routes/how-it-was-made.tsx", { id: "how-it-was-made" }),
] satisfies RouteConfig;
