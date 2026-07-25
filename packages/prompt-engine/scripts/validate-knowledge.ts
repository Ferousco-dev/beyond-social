/**
 * Validate the authored knowledge base against the chunk schema. Run in CI so a
 * malformed chunk (bad category, missing field, empty body) fails the build
 * rather than the ingestion job at runtime.
 *
 *   tsx scripts/validate-knowledge.ts <prompts-dir>
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { buildChunksFromFile } from "../src/index";

const root = process.argv[2] ?? "prompts";
const NOW = "2026-07-25T00:00:00Z";

function markdownFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...markdownFiles(full));
    } else if (
      entry.name.endsWith(".md") &&
      entry.name !== "README.md" &&
      entry.name !== "ARCHITECTURE.md" &&
      !full.includes(`${join(root, "system")}`)
    ) {
      out.push(full);
    }
  }
  return out;
}

let files = 0;
let chunks = 0;
const errors: string[] = [];

for (const file of markdownFiles(root)) {
  const raw = readFileSync(file, "utf8");
  if (!raw.startsWith("---")) continue; // prose docs (rubric, notes), not chunks
  try {
    const built = buildChunksFromFile(raw, "voyage-3-large", 1024, NOW);
    files++;
    chunks += built.length;
    for (const item of built) {
      if (item.chunk.contentHash.length !== 64) throw new Error("content hash malformed");
    }
  } catch (error) {
    errors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

process.stdout.write(`validated ${files} files, ${chunks} chunks\n`);
if (errors.length > 0) {
  process.stderr.write(`\n${errors.length} error(s):\n`);
  for (const error of errors) process.stderr.write(` - ${error}\n`);
  process.exit(1);
}
process.stdout.write("all authored chunks parse and validate\n");
