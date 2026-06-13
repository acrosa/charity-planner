import { createHash } from "node:crypto";

/** Raw charity row as it appears in dataset/charities_10k.jsonl. */
export interface RawCharity {
  ein: string;
  name: string;
  mission?: string | null;
  description?: string | null;
  cause?: string | null;
  city?: string | null;
  state?: string | null;
  revenue?: number | null;
  website?: string | null;
  logo_url?: string | null;
}

// Cap per-document length so a Voyage batch stays well under the request token
// limit. ~6000 chars ≈ ~1500 tokens; the most informative text is near the top.
const MAX_CHARS = 6000;

/**
 * Build the text that gets embedded for a charity. Name first (so name-driven
 * queries land), then mission + description, then a trailing structured line
 * that helps cause/geo queries ("food bank in oakland") retrieve well.
 *
 * Unit-tested (BRIEF.md §Quality-tooling) — keep it pure and deterministic.
 */
export function buildEmbeddingText(c: RawCharity): string {
  const parts: string[] = [c.name.trim()];
  if (c.mission?.trim()) parts.push(c.mission.trim());
  if (c.description?.trim()) parts.push(c.description.trim());

  const loc = [c.city?.trim(), c.state?.trim()].filter(Boolean).join(", ");
  const tail: string[] = [];
  if (c.cause?.trim()) tail.push(`Cause area: ${c.cause.trim()}.`);
  if (loc) tail.push(`Located in ${loc}.`);
  if (tail.length) parts.push(tail.join(" "));

  return parts.join("\n\n").replace(/\s+\n/g, "\n").trim().slice(0, MAX_CHARS);
}

/** Stable content hash for idempotent re-ingest (skip re-embedding unchanged text). */
export function contentHash(embeddingText: string): string {
  return createHash("sha256").update(embeddingText).digest("hex");
}

/** A row is unusable for retrieval if BOTH mission and description are empty. */
export function isBothNull(c: RawCharity): boolean {
  return !c.mission?.trim() && !c.description?.trim();
}
