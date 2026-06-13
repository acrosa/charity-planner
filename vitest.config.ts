import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// Standalone config: the React Router Vite plugin is intentionally NOT loaded
// here — it conflicts with Vitest's runner. Unit tests target pure pipeline
// logic (allocation, embedding_text, exclusion extraction), not routes.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["app/**/*.test.ts", "scripts/**/*.test.ts"],
    globals: false,
  },
});
