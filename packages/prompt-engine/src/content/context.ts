import type { ChunkFrontmatter } from "../schema/chunk";
import type { Section } from "./chunker";

/**
 * Contextual retrieval (Anthropic): prepend a short, situating blurb to each
 * section before embedding, so an otherwise-generic passage carries where it
 * belongs. This measurably lifts retrieval on chunked corpora.
 *
 * We build the header deterministically from frontmatter by default (free, no
 * LLM call). An LLM-authored header can be swapped in during ingest for chunks
 * where the extra nuance is worth the cost; the embedding is keyed on the final
 * header text via the content hash, so either path stays idempotent.
 */
export function templateContextualHeader(frontmatter: ChunkFrontmatter, section: Section): string {
  const scope = describeScope(frontmatter);
  const where =
    section.heading === "" ? frontmatter.title : `${frontmatter.title} > ${section.heading}`;
  return `${where}. Category: ${frontmatter.category}${scope}.`;
}

function describeScope(frontmatter: ChunkFrontmatter): string {
  const parts: string[] = [];
  const { platforms, productTypes, styles } = frontmatter.applicability;
  if (platforms.length > 0) parts.push(`platforms: ${platforms.join(", ")}`);
  if (productTypes.length > 0) parts.push(`products: ${productTypes.join(", ")}`);
  if (styles.length > 0) parts.push(`styles: ${styles.join(", ")}`);
  if (frontmatter.tags.length > 0) parts.push(`tags: ${frontmatter.tags.join(", ")}`);
  return parts.length > 0 ? `. ${parts.join("; ")}` : "";
}
