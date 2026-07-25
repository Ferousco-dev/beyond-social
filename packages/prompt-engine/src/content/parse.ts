import { chunkFrontmatterSchema, type ChunkFrontmatter } from "../schema/chunk";
import { parseFrontmatter } from "./frontmatter";

export interface ParsedChunkFile {
  frontmatter: ChunkFrontmatter;
  body: string;
}

/**
 * Parse and validate one authored chunk file. Frontmatter is checked against the
 * schema here so a malformed or incomplete chunk is rejected at ingest time with
 * a precise error, never silently embedded.
 */
export function parseChunkFile(raw: string): ParsedChunkFile {
  const { data, body } = parseFrontmatter(raw);
  const frontmatter = chunkFrontmatterSchema.parse(data);
  if (body.trim() === "") throw new Error(`Chunk ${frontmatter.id} has an empty body`);
  return { frontmatter, body };
}
