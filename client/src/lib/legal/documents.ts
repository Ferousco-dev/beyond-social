import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

import { legalDocumentSchema, type LegalDocument, type LegalDocumentKind } from "./schema";

export type { LegalDocument, LegalDocumentKind } from "./schema";

const FALLBACKS: Readonly<Record<LegalDocumentKind, LegalDocument>> = {
  privacy: {
    status: "coming_soon",
    title: "Privacy policy",
    summary: "Our privacy policy is being prepared for launch.",
    body: "Contact hello@beyondsocial.app with privacy questions before launch.",
  },
  terms: {
    status: "coming_soon",
    title: "Terms and conditions",
    summary: "Our terms and conditions are being prepared for launch.",
    body: "Contact hello@beyondsocial.app with terms questions before launch.",
  },
};

export async function getLegalDocument(kind: LegalDocumentKind): Promise<LegalDocument> {
  if (!isSupabaseConfigured) return FALLBACKS[kind];

  const { data } = await createServiceClient()
    .from("app_config")
    .select("value")
    .eq("key", `legal.${kind}`)
    .maybeSingle();
  const parsed = legalDocumentSchema.safeParse(data?.value);
  return parsed.success ? parsed.data : FALLBACKS[kind];
}
