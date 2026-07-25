import { createHash } from "node:crypto";

/** Stable content fingerprint. Drives idempotent re-embedding: the pipeline
 * only re-embeds a chunk when this changes, so re-ingesting an unchanged base
 * is free. */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** The exact text an embedding is computed over: contextual header + body. */
export function embeddingInput(contextualHeader: string, body: string): string {
  return contextualHeader.length > 0 ? `${contextualHeader}\n\n${body}` : body;
}
