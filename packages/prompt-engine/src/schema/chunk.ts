import { z } from "zod";

/**
 * A chunk is the atomic unit of retrievable knowledge. Authored chunks live as
 * Markdown-with-frontmatter under `prompts/`; derived fields (embeddings,
 * scores) are computed by the ingestion pipeline and stored in Postgres. The
 * schema below is the single source of truth for both.
 */

export const CHUNK_CATEGORIES = [
  // Product / UI design domain.
  "design-principle",
  "ux-heuristic",
  "typography",
  "color-system",
  "motion",
  "accessibility",
  "visual-hierarchy",
  "layout",
  "component",
  "branding",
  "copywriting",
  "conversion",
  "product-pattern",
  "example",
  // Video generation domain (the core product surface).
  "video-prompting",
  "cinematography",
  "camera-movement",
  "lighting",
  "color-grading",
  "editing",
  "pacing",
  "audio",
  "narrative",
  "video-style",
  "platform-format",
  "video-pattern",
  "video-quality",
  "short-form",
] as const;

export const chunkCategorySchema = z.enum(CHUNK_CATEGORIES);
export type ChunkCategory = z.infer<typeof chunkCategorySchema>;

export const PLATFORMS = [
  "web",
  "mobile",
  "ios",
  "android",
  "email",
  // Video delivery surfaces.
  "tiktok",
  "instagram",
  "youtube",
  "facebook",
] as const;
export const platformSchema = z.enum(PLATFORMS);
export type Platform = z.infer<typeof platformSchema>;

export const PRODUCT_TYPES = [
  "landing-page",
  "saas-dashboard",
  "e-commerce",
  "mobile-app",
  "marketing-site",
  "portfolio",
  "blog",
  "auth",
  "onboarding",
  // Video output types.
  "short-form-video",
  "talking-avatar",
  "product-video",
  "ad-creative",
  "explainer",
  "ugc",
] as const;
export const productTypeSchema = z.enum(PRODUCT_TYPES);
export type ProductType = z.infer<typeof productTypeSchema>;

/** How a chunk entered the knowledge base. Governs the review it must pass. */
export const chunkSourceSchema = z.enum(["authored", "learned", "imported"]);
export type ChunkSource = z.infer<typeof chunkSourceSchema>;

/** Lifecycle. Only `active` chunks are retrievable at generation time. */
export const chunkStatusSchema = z.enum(["active", "candidate", "deprecated"]);
export type ChunkStatus = z.infer<typeof chunkStatusSchema>;

/** Applicability filters, used to pre-filter candidates before vector search. */
export const applicabilitySchema = z.object({
  platforms: z.array(platformSchema).default([]),
  productTypes: z.array(productTypeSchema).default([]),
  styles: z.array(z.string()).default([]),
});
export type Applicability = z.infer<typeof applicabilitySchema>;

/**
 * Author-supplied frontmatter. Everything a human writes by hand. Kept small
 * and forgiving so authoring stays low-friction; the pipeline derives the rest.
 */
export const chunkFrontmatterSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: chunkCategorySchema,
  subcategory: z.string().optional(),
  tags: z.array(z.string()).default([]),
  applicability: applicabilitySchema.default({ platforms: [], productTypes: [], styles: [] }),
  source: chunkSourceSchema.default("authored"),
  version: z.number().int().positive().default(1),
  /** Author's prior on quality, 0..1. The feedback loop moves the live score. */
  priorQuality: z.number().min(0).max(1).default(0.7),
});
export type ChunkFrontmatter = z.infer<typeof chunkFrontmatterSchema>;

/**
 * A fully-realized chunk: frontmatter + body + everything the pipeline derives.
 * This is what the vector store persists and retrieval returns.
 */
export const chunkSchema = chunkFrontmatterSchema.extend({
  body: z.string().min(1),
  /** Short blurb prepended before embedding (Anthropic contextual retrieval). */
  contextualHeader: z.string().default(""),
  status: chunkStatusSchema.default("active"),
  tokenCount: z.number().int().nonnegative(),
  /** SHA-256 of `${contextualHeader}\n${body}`; drives idempotent re-embedding. */
  contentHash: z.string().length(64),
  embeddingModel: z.string(),
  embeddingDim: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Chunk = z.infer<typeof chunkSchema>;
