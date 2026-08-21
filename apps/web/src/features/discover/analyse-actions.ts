"use server";

import { z } from "zod";

import { getIndustry } from "@/lib/profile/industry";
import { createClient } from "@/lib/supabase/server";
import { analysePost, type PostAnalysis } from "@/lib/tiktok/analyse";
import { categoryLabel } from "@/lib/trends/categories";

/**
 * Reading a post before borrowing from it.
 *
 * Signed-in only and rate-limited by the model gateway like every other judge
 * call. The post comes from the client because the scroller already has it, and
 * nothing here trusts it beyond bounding its size: this call reads text and
 * returns text, and touches no row the caller does not own.
 */

const schema = z.object({
  handle: z.string().trim().min(1).max(24),
  caption: z.string().max(2000).default(""),
  viewCount: z.number().nonnegative().nullable().default(null),
  likeCount: z.number().nonnegative().nullable().default(null),
  commentCount: z.number().nonnegative().nullable().default(null),
  shareCount: z.number().nonnegative().nullable().default(null),
  durationSeconds: z.number().nonnegative().max(3600).nullable().default(null),
  hashtags: z.array(z.string().max(80)).max(30).default([]),
  transcript: z.string().max(5000).nullable().default(null),
});

export type AnalyseResult =
  | { status: "ok"; analysis: PostAnalysis }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

export async function analysePostAction(input: z.input<typeof schema>): Promise<AnalyseResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "That post could not be read." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in to use a post as inspiration." };

  const industry = await getIndustry();
  const analysis = await analysePost(
    parsed.data,
    // `general` means no particular industry, which is no steer at all.
    industry !== null && industry !== "general" ? categoryLabel(industry) : null,
  );

  if (analysis === null) return { status: "unconfigured" };
  return { status: "ok", analysis };
}
