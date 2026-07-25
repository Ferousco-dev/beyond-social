import type { Llm } from "../ports";
import { CHUNK_CATEGORIES, PLATFORMS, PRODUCT_TYPES } from "../schema/chunk";
import { draftChunkSchema, type DraftChunk } from "../schema/learning";
import { z } from "zod";

const extractionSchema = z.object({
  chunks: z.array(
    z.object({
      title: z.string(),
      category: z.string(),
      tags: z.array(z.string()).default([]),
      platforms: z.array(z.string()).default([]),
      productTypes: z.array(z.string()).default([]),
      styles: z.array(z.string()).default([]),
      body: z.string(),
    }),
  ),
});

export interface ExtractInput {
  prompt: string;
  /** The successful output, if any, so the extractor can learn what worked. */
  output?: string;
  priorQuality?: number;
  maxChunks?: number;
}

/**
 * Turns a valuable prompt into one or more generalized, reusable draft chunks.
 * Two jobs the model does well and rules cannot: generalizing a specific request
 * into durable craft, and stripping user-specific details (names, brands, one-off
 * parameters) so the knowledge is safe and reusable across everyone. Output is
 * validated against the chunk schema; anything malformed is dropped, not stored.
 */
export class KnowledgeExtractor {
  constructor(private readonly llm: Llm) {}

  async extract(input: ExtractInput): Promise<DraftChunk[]> {
    const raw = await this.llm.complete({
      system: "You distill reusable design/video knowledge from prompts. Output strict JSON only.",
      messages: [{ role: "user", content: buildPrompt(input) }],
      temperature: 0.2,
      json: true,
    });
    const parsed = extractionSchema.parse(safeJson(raw));

    const drafts: DraftChunk[] = [];
    for (const c of parsed.chunks.slice(0, input.maxChunks ?? 3)) {
      const candidate = draftChunkSchema.safeParse({
        id: slug(c.title),
        title: c.title,
        category: c.category,
        tags: c.tags,
        applicability: {
          platforms: c.platforms.filter(isPlatform),
          productTypes: c.productTypes.filter(isProductType),
          styles: c.styles,
        },
        source: "learned",
        version: 1,
        priorQuality: input.priorQuality ?? 0.6,
        body: c.body,
      });
      // Drop anything that does not validate (e.g. a hallucinated category).
      if (candidate.success) drafts.push(candidate.data);
    }
    return drafts;
  }
}

function buildPrompt(input: ExtractInput): string {
  return [
    "Extract the durable, reusable knowledge from the PROMPT (and OUTPUT if given).",
    "Generalize one-off requests into craft that applies broadly. REMOVE all",
    "user-specific details: names, brand names, personal data, one-off parameters.",
    "Each chunk: a claim, the why, and a concrete example, in Markdown.",
    "",
    `Allowed categories: ${CHUNK_CATEGORIES.join(", ")}.`,
    `Allowed platforms: ${PLATFORMS.join(", ")}.`,
    `Allowed productTypes: ${PRODUCT_TYPES.join(", ")}.`,
    "Return 1-3 chunks; fewer is better if the knowledge is one idea.",
    "",
    "PROMPT:",
    input.prompt,
    ...(input.output ? ["", "OUTPUT:", input.output] : []),
    "",
    'Return JSON: {"chunks":[{"title","category","tags","platforms","productTypes","styles","body"}]}',
  ].join("\n");
}

function isPlatform(value: string): boolean {
  return (PLATFORMS as readonly string[]).includes(value);
}

function isProductType(value: string): boolean {
  return (PRODUCT_TYPES as readonly string[]).includes(value);
}

function slug(text: string): string {
  return `learned-${text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)}`;
}

function safeJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Extractor did not return JSON");
  return JSON.parse(raw.slice(start, end + 1));
}
