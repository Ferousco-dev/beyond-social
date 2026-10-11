import { z } from "zod";

export const legalDocumentSchema = z.object({
  status: z.enum(["coming_soon", "published"]),
  title: z.string().trim().min(1).max(100),
  summary: z.string().trim().min(1).max(240),
  body: z.string().trim().min(1).max(12_000),
});

export type LegalDocument = z.infer<typeof legalDocumentSchema>;
export type LegalDocumentKind = "privacy" | "terms";
