import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  // Non-fatal for typecheck/lint; db:generate and db:migrate need it set.
  console.warn("[drizzle] DATABASE_URL is not set — db commands will fail until it is.");
}

export default defineConfig({
  schema: "./app/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
