/**
 * BRIEF.md §1 — verify every third-party service is reachable and usable with
 * the keys in .env.local. Prints a status table; never echoes secret values.
 * Run: pnpm tsx --env-file=.env.local scripts/check-services.ts
 */
import Anthropic from "@anthropic-ai/sdk";
import postgres from "postgres";

type Row = { service: string; ok: boolean; detail: string };
const rows: Row[] = [];
const mask = (v?: string) => (v ? `set(${v.length}c)` : "MISSING");

async function checkAnthropic() {
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 16,
      messages: [{ role: "user", content: "Reply with the single word: OK" }],
    });
    const text = msg.content.find((b) => b.type === "text");
    rows.push({
      service: "Anthropic claude-opus-4-8",
      ok: true,
      detail: `reply="${text && "text" in text ? text.text.trim() : "?"}" stop=${msg.stop_reason}`,
    });
  } catch (e) {
    rows.push({ service: "Anthropic claude-opus-4-8", ok: false, detail: String(e).slice(0, 120) });
  }
}

async function checkWebSearch() {
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: "What did the American Red Cross announce most recently? One sentence.",
        },
      ],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2 } as never],
    });
    const used = msg.content.some((b) => (b as { type: string }).type === "server_tool_use");
    rows.push({
      service: "Anthropic web_search tool",
      ok: true,
      detail: `tool_used=${used} stop=${msg.stop_reason}`,
    });
  } catch (e) {
    rows.push({ service: "Anthropic web_search tool", ok: false, detail: String(e).slice(0, 120) });
  }
}

async function checkVoyageEmbeddings() {
  for (const dims of [undefined, 1024]) {
    try {
      const res = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "voyage-4",
          input: ["A food bank serving families in Oakland, California."],
          input_type: "document",
          ...(dims ? { output_dimension: dims } : {}),
        }),
      });
      const body = (await res.json()) as {
        data?: { embedding: number[] }[];
        error?: unknown;
        detail?: string;
      };
      const dim = body.data?.[0]?.embedding?.length;
      rows.push({
        service: `Voyage voyage-4 embed${dims ? ` (output_dimension=${dims})` : " (default)"}`,
        ok: res.ok && !!dim,
        detail: res.ok ? `dims=${dim}` : `HTTP ${res.status} ${JSON.stringify(body).slice(0, 100)}`,
      });
    } catch (e) {
      rows.push({ service: `Voyage voyage-4 embed`, ok: false, detail: String(e).slice(0, 120) });
    }
  }
}

async function checkVoyageRerank() {
  try {
    const res = await fetch("https://api.voyageai.com/v1/rerank", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "rerank-2.5",
        query: "help feed hungry families",
        documents: [
          "A community food bank in Oakland.",
          "A software company in New York.",
          "A wildlife sanctuary.",
        ],
        top_k: 3,
      }),
    });
    const body = (await res.json()) as { data?: { index: number; relevance_score: number }[] };
    const top = body.data?.[0];
    rows.push({
      service: "Voyage rerank-2.5",
      ok: res.ok && !!body.data,
      detail: res.ok
        ? `top_index=${top?.index} score=${top?.relevance_score?.toFixed(3)}`
        : `HTTP ${res.status}`,
    });
  } catch (e) {
    rows.push({ service: "Voyage rerank-2.5", ok: false, detail: String(e).slice(0, 120) });
  }
}

async function checkPostgres() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    rows.push({ service: "Postgres (Neon/Fly)", ok: false, detail: "DATABASE_URL MISSING" });
    return;
  }
  const sql = postgres(url, { max: 1, prepare: false });
  try {
    const [{ version }] = await sql`select version()`;
    const ext =
      await sql`select name, installed_version from pg_available_extensions where name in ('vector','pg_trgm') order by name`;
    rows.push({
      service: "Postgres connect",
      ok: true,
      detail: String(version).split(",")[0].slice(0, 40),
    });
    rows.push({
      service: "Postgres extensions",
      ok: ext.length === 2,
      detail:
        ext
          .map((e) => `${e.name}${e.installed_version ? `=${e.installed_version}` : "(available)"}`)
          .join(", ") || "none available",
    });
  } catch (e) {
    rows.push({ service: "Postgres connect", ok: false, detail: String(e).slice(0, 120) });
  } finally {
    await sql.end();
  }
}

async function main() {
  console.log("env presence:");
  for (const k of [
    "ANTHROPIC_API_KEY",
    "VOYAGE_API_KEY",
    "DATABASE_URL",
    "FLY_API_TOKEN",
    "MOTION_TOKEN",
    "ELEVENLABS_API_KEY",
    "USER_IMESSAGE",
  ]) {
    console.log(`  ${k.padEnd(20)} ${mask(process.env[k])}`);
  }
  console.log("");

  await checkAnthropic();
  await checkWebSearch();
  await checkVoyageEmbeddings();
  await checkVoyageRerank();
  await checkPostgres();

  console.log(`${"SERVICE".padEnd(42)} OK   DETAIL`);
  console.log("-".repeat(96));
  for (const r of rows)
    console.log(`${r.service.padEnd(42)} ${(r.ok ? "✓" : "✗").padEnd(4)} ${r.detail}`);
  console.log("-".repeat(96));
  const failed = rows.filter((r) => !r.ok);
  console.log(
    failed.length ? `\n${failed.length} service check(s) FAILED.` : "\nAll service checks passed.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
