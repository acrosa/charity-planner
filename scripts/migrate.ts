/**
 * Applies the checked-in Drizzle migrations after ensuring the required Postgres
 * extensions exist (BRIEF.md §Setup). `pgvector` and `pg_trgm` MUST be created
 * before the migration runs because the table uses `vector(1024)` and the
 * indexes use `hnsw` / `gin_trgm_ops` operator classes.
 *
 * Run `pnpm db:generate` first to produce SQL under ./drizzle from the schema.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { makeSql } from "../app/db/client";

async function main() {
  const sql = makeSql(1);
  const db = drizzle(sql);

  console.log("[migrate] ensuring extensions: vector, pg_trgm");
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;

  console.log("[migrate] applying migrations from ./drizzle");
  await migrate(db, { migrationsFolder: "./drizzle" });

  await sql.end();
  console.log("[migrate] done");
}

main().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
