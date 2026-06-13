import { sql } from "drizzle-orm";
import { bigint, index, jsonb, pgTable, text, timestamp, vector } from "drizzle-orm/pg-core";

// Voyage `voyage-4` document embeddings are 1024-dim. The `vector(1024)` column
// and the hnsw / gin_trgm_ops indexes require the `pgvector` and `pg_trgm`
// extensions — `pnpm db:migrate` creates those before applying migrations
// (BRIEF.md §Setup-and-infra).
export const charities = pgTable(
  "charities",
  {
    ein: text("ein").primaryKey(),
    name: text("name").notNull(),
    mission: text("mission"),
    description: text("description"),
    cause: text("cause"),
    city: text("city"),
    state: text("state"),
    revenue: bigint("revenue", { mode: "number" }),
    website: text("website"),
    logoUrl: text("logo_url"),
    // Concatenated name + mission + description that gets embedded.
    embeddingText: text("embedding_text"),
    // Idempotency key — skip re-embedding when embedding_text is unchanged.
    contentHash: text("content_hash"),
    embedding: vector("embedding", { dimensions: 1024 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    // Cosine ANN over the embedding (vector `<=>` recall leg).
    index("charities_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
    // Trigram name leg of candidate recall + fuzzy/misspelled queries.
    index("charities_name_trgm_idx").using("gin", sql`${t.name} gin_trgm_ops`),
    index("charities_cause_idx").on(t.cause),
    index("charities_state_idx").on(t.state),
  ],
);

// Shareable report snapshots — `/api/share` writes a slug, `/r/:slug` reads it.
export const reports = pgTable("reports", {
  slug: text("slug").primaryKey(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Charity = typeof charities.$inferSelect;
export type NewCharity = typeof charities.$inferInsert;
export type Report = typeof reports.$inferSelect;
