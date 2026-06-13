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

/** Drop the cached clients so the next getSql() opens a fresh connection. */
function resetSql() {
  const c = _client;
  _client = undefined;
  _db = undefined;
  if (c) c.end({ timeout: 1 }).catch(() => {});
}

const CONN_ERR =
  /ETIMEDOUT|EHOSTUNREACH|ECONNREFUSED|ECONNRESET|ENOTFOUND|Connection terminated|CONNECT_TIMEOUT|connection closed|fetch failed/i;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run a DB operation, retrying on transient connection errors with a fresh
 * client each time (Neon pooler / flaky networks intermittently drop connects).
 */
export async function withDbRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!CONN_ERR.test(String(err)) || i === attempts - 1) throw err;
      resetSql();
      await sleep(Math.min(800 * 2 ** i, 6000));
    }
  }
  throw lastErr;
}

/** Lazily-created singleton Drizzle client — importing never throws without a URL. */
export function getDb() {
  if (_db) return _db;
  _db = drizzle(getSql(), { schema });
  return _db;
}

export { schema };
