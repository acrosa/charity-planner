import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  // Load ALL vars from .env / .env.local (no prefix filter) into process.env so
  // server-side route code (DB, Anthropic, Voyage) sees them in dev. In prod,
  // react-router-serve reads process.env directly (set via `fly secrets`).
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  };
});
