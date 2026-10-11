"use server";

import { z } from "zod";

import { getIndustry } from "@/lib/profile/industry";
import { categoryLabel } from "@/lib/trends/categories";
import { createClient } from "@/lib/supabase/server";
import { subjectSchema, type VideoScript } from "@/lib/script/schema";
import { writeScript } from "@/lib/script/write";
import { postAnalysisSchema } from "@/lib/tiktok/analyse";

/**
 * Writing the script, and writing it again once the user has made it theirs.
 *
 * One action for both, because they are the same call: the second one carries a
 * subject the user edited and the first one does not. Signed-in only, like
 * every other pass that spends model budget.
 *
 * The analysis comes back from the browser, which already had it on screen, and
 * is re-validated here rather than trusted. Nothing in it addresses a row: it
 * is text in and text out.
 */

const schema = z.object({
  analysis: postAnalysisSchema,
  /** Absent on the first draft, present on every rewrite. */
  subject: subjectSchema.optional(),
});

export type WriteScriptResult =
  | { status: "ok"; script: VideoScript }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

export async function writeScriptAction(input: z.input<typeof schema>): Promise<WriteScriptResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "That script could not be written." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in to write a script." };

  const industry = await getIndustry();
  const script = await writeScript({
    analysis: parsed.data.analysis,
    // `general` means no particular industry, which is no steer at all.
    industry: industry !== null && industry !== "general" ? categoryLabel(industry) : null,
    ...(parsed.data.subject ? { subject: parsed.data.subject } : {}),
  });

  if (script === null) return { status: "unconfigured" };
  return { status: "ok", script };
}
