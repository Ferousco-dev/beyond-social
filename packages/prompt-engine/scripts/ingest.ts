/**
 * Ingest the authored knowledge base into pgvector: parse -> chunk -> embed ->
 * upsert. Idempotent by content hash, so re-running only pays for what changed.
 * Run once the DB (migration 0007) and keys exist:
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... VOYAGE_API_KEY=... \
 *     tsx scripts/ingest.ts ../../prompts
 *
 * Uses the Supabase REST RPC endpoint directly (via fetch) so this script needs
 * no supabase-js dependency; it satisfies the store's rpc-only port.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CachingEmbedder,
  GeminiEmbedder,
  Ingestor,
  OpenAiEmbedder,
  SupabaseVectorStore,
  VoyageEmbedder,
} from "../src/index";
import type { Embedder, SupabaseRpcClient } from "../src/index";

const root = process.argv[2] ?? "prompts";
const url = requireEnv("SUPABASE_URL");
const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const rpc: SupabaseRpcClient = {
  async rpc(fn, args) {
    const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(args),
    });
    if (!res.ok) return { data: null, error: { message: `${res.status} ${await res.text()}` } };
    const text = await res.text();
    return { data: text ? JSON.parse(text) : null, error: null };
  },
};

// Cached because re-ingesting a corpus re-embeds every unchanged chunk, which
// is the single most wasteful call pattern in the system.
// `document` encoding here is the counterpart to the `query` encoding used at
// retrieval; mixing the two sides measurably degrades results.
function pickEmbedder(): Embedder {
  if (process.env.VOYAGE_API_KEY) {
    return new VoyageEmbedder(process.env.VOYAGE_API_KEY, "voyage-3-large", 1024, "document");
  }
  if (process.env.OPENAI_API_KEY) return new OpenAiEmbedder(process.env.OPENAI_API_KEY);
  return new GeminiEmbedder(
    requireEnv("GEMINI_API_KEY"),
    "gemini-embedding-001",
    1024,
    "RETRIEVAL_DOCUMENT",
  );
}

const embedder: Embedder = new CachingEmbedder(pickEmbedder());

function mdFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...mdFiles(full));
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

async function main(): Promise<void> {
  const inputs = mdFiles(root)
    .map((ref) => ({ ref, raw: readFileSync(ref, "utf8") }))
    .filter((input) => input.raw.startsWith("---")); // only frontmatter chunks

  const ingestor = new Ingestor(embedder, new SupabaseVectorStore(rpc));
  const report = await ingestor.ingest(inputs, new Date().toISOString());
  process.stdout.write(
    `ingested ${report.ingested}, skipped ${report.skippedUnchanged}, errors ${report.errors.length}\n`,
  );
  for (const error of report.errors) process.stderr.write(` - ${error.ref}: ${error.message}\n`);
  if (report.errors.length > 0) process.exit(1);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

void main();
