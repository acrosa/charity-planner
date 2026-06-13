import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Lazily-created singleton so importing this module never throws when
// DATABASE_URL is absent (e.g. during typecheck or a DB-free unit test). The
// connection is only opened on first `db` access.
let _client: ReturnType<typeof postgres> | undefined;
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — cannot connect to Postgres.");
  }
  _client = postgres(url, { max: 10, prepare: false });
  _db = drizzle(_client, { schema });
  return _db;
}

export function getDb() {
  return _db ?? connect();
}

export { schema };
