"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { legalDocumentSchema } from "@/lib/legal/schema";

import { setAppConfig } from "./config";
import { type ActionResult } from "./result";

const updateLegalDocumentSchema = z.object({
  kind: z.enum(["privacy", "terms"]),
  document: legalDocumentSchema,
});

export async function updateLegalDocument(
  input: z.input<typeof updateLegalDocumentSchema>,
): Promise<ActionResult> {
  const parsed = updateLegalDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the document" };
  }

  const result = await setAppConfig({
    key: `legal.${parsed.data.kind}`,
    value: parsed.data.document,
  });
  if (result.ok) {
    revalidatePath(`/${parsed.data.kind}`);
    revalidatePath("/dashboard/admin/legal");
  }
  return result;
}
