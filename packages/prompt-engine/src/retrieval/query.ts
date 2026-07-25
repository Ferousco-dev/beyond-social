import type { GenerationRequest } from "../schema/feedback";

/**
 * Turn a generation request into the text we embed and lexically search. We fold
 * in structured hints (product type, platform, sections, styles) as natural
 * phrases so both the dense and sparse legs see them, rather than relying on
 * metadata filters alone. Filters narrow the candidate set; this query ranks it.
 */
export function buildQueryText(request: GenerationRequest): string {
  const parts: string[] = [request.prompt.trim()];
  if (request.productType) parts.push(`Product: ${request.productType}.`);
  if (request.platform) parts.push(`Platform: ${request.platform}.`);
  if (request.sections.length > 0) parts.push(`Sections: ${request.sections.join(", ")}.`);
  if (request.styles.length > 0) parts.push(`Style: ${request.styles.join(", ")}.`);
  return parts.join(" ");
}
