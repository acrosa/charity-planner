import { setDefaultResultOrder } from "node:dns";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Neon pooler endpoints resolve to both IPv4 and IPv6; many networks (incl. local
// dev) can't route the v6 addresses, so connections fail intermittently on
// address ordering. Prefer IPv4 everywhere. Harmless on Fly → Neon over public v4.
try {
  setDefaultResultOrder("ipv4first");
} catch {
  // older node / already set — ignore
}

/** Create a raw postgres-js client with SSL + sane timeouts. Reused by scripts. */
export function makeSql(max = 10) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — cannot connect to Postgres.");
  }
  return postgres(url, {
    max,
    prepare: false, // pgBouncer/Neon pooler is in transaction mode
    ssl: "require",
    connect_timeout: 30,
    idle_timeout: 20,
  });
}

let _client: ReturnType<typeof postgres> | undefined;
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

/** Shared raw postgres-js client (for vector/trigram SQL). Singleton pool. */
export function getSql() {
  if (!_client) _client = makeSql(10);
  return _client;
}

/** Lazily-created singleton Drizzle client — importing never throws without a URL. */
export function getDb() {
  if (_db) return _db;
  _db = drizzle(getSql(), { schema });
  return _db;
}

export { schema };
