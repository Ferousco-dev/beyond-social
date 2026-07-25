import { splitSections } from "../content/chunker";
import { templateContextualHeader } from "../content/context";
import { embeddingInput, sha256Hex } from "../content/hash";
import { parseChunkFile } from "../content/parse";
import { estimateTokens } from "../content/tokens";
import { chunkSchema, type Chunk } from "../schema/chunk";

export interface BuiltChunk {
  chunk: Chunk;
  /** Exact text to embed (contextual header + body). */
  embedInput: string;
}

/**
 * Turn one authored file into one or more fully-derived chunks (validated), plus
 * the text each should be embedded over. Sectioned files yield stable per-section
 * ids so a chunk's identity survives edits to its siblings. This is pure: it does
 * no I/O, so it is trivially testable and deterministic given the same inputs.
 */
export function buildChunksFromFile(
  raw: string,
  embedModel: string,
  embedDim: number,
  now: string,
): BuiltChunk[] {
  const { frontmatter, body } = parseChunkFile(raw);
  const sections = splitSections(body);
  const multi = sections.length > 1;

  return sections.map((section, index) => {
    const id = multi
      ? `${frontmatter.id}#${slug(section.heading) || String(index)}`
      : frontmatter.id;
    const contextualHeader = templateContextualHeader(frontmatter, section);
    const embedInput = embeddingInput(contextualHeader, section.text);
    const chunk = chunkSchema.parse({
      ...frontmatter,
      id,
      body: section.text,
      contextualHeader,
      status: frontmatter.source === "learned" ? "candidate" : "active",
      tokenCount: estimateTokens(section.text),
      contentHash: sha256Hex(embedInput),
      embeddingModel: embedModel,
      embeddingDim: embedDim,
      createdAt: now,
      updatedAt: now,
    });
    return { chunk, embedInput };
  });
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
