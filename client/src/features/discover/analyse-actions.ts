"use server";

import { z } from "zod";

import { canRunModel } from "@/lib/credits/queries";
import { DENIAL_COPY, type RunCheck } from "@/lib/credits/types";
import { getIndustry } from "@/lib/profile/industry";
import { isPromptEngineConfigured, serverEnv } from "@/lib/server-env";
import { fetchPostVideo } from "@/lib/social-scrape/video-fetch";
import { SCRAPE_PLATFORMS } from "@/lib/social-scrape/types";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { analysePost, type PostAnalysis } from "@/lib/tiktok/analyse";
import { analysePostDeep } from "@/lib/tiktok/deep-analyse";
import { categoryLabel } from "@/lib/trends/categories";

/**
 * Reading a post before borrowing from it.
 *
 * Two tiers, both metered: "inspiration" reads the caption and the numbers,
 * "deep" fetches and actually watches the clip. Neither is free. The debit
 * runs through the service role (`debit_model_credits`), the same way every
 * other credit-charging RPC in this codebase does: a security-definer
 * function called directly from the user's own session still carries that
 * user's `auth.uid()`, which would trip `profiles_guard_privileged_columns`'s
 * own rule that an account holder cannot move their own credit columns.
 * `canRunModel` still runs on the user's own session first, so the UI can
 * show the cost and a clean denial before anything is attempted.
 */

const postSchema = z.object({
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

const deepSchema = postSchema.extend({
  platform: z.enum(SCRAPE_PLATFORMS),
  url: z.string().url(),
});

export type AnalyseResult =
  | { status: "ok"; analysis: PostAnalysis }
  | { status: "unconfigured" }
  | { status: "denied"; message: string }
  | { status: "error"; message: string };

export interface AnalysisCosts {
  readonly inspiration: RunCheck;
  readonly deep: RunCheck;
}

/** What each tier costs and whether the signed-in user can afford it, so the
 *  price is on the button before anything is spent. */
export async function analysisCostsAction(): Promise<AnalysisCosts> {
  const [inspiration, deep] = await Promise.all([
    canRunModel("discover.inspiration"),
    canRunModel("discover.inspiration-deep"),
  ]);
  return { inspiration, deep };
}

async function resolveIndustryLabel(): Promise<string | null> {
  const industry = await getIndustry();
  // `general` means no particular industry, which is no steer at all.
  return industry !== null && industry !== "general" ? categoryLabel(industry) : null;
}

async function requireUser(): Promise<{ id: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function analysePostAction(input: z.input<typeof postSchema>): Promise<AnalyseResult> {
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "That post could not be read." };
  if (!isPromptEngineConfigured) return { status: "unconfigured" };

  const user = await requireUser();
  if (!user) return { status: "denied", message: DENIAL_COPY.not_authenticated };

  const check = await canRunModel("discover.inspiration");
  if (!check.allowed) return { status: "denied", message: DENIAL_COPY[check.reason] };

  const externalRef = `discover.inspiration:${crypto.randomUUID()}`;
  const service = createServiceClient();
  const { data: debited, error: debitError } = await service.rpc("debit_model_credits", {
    p_user: user.id,
    p_model: "discover.inspiration",
    p_external_ref: externalRef,
  });
  if (debitError !== null || debited !== true) {
    return { status: "denied", message: DENIAL_COPY.insufficient_credits };
  }

  const analysis = await analysePost(parsed.data, await resolveIndustryLabel());
  if (analysis === null) {
    await service.rpc("refund_model_credits", { p_external_ref: externalRef });
    return { status: "error", message: "That post could not be analysed. Your credit was refunded." };
  }

  return { status: "ok", analysis };
}

export async function analysePostDeepAction(
  input: z.input<typeof deepSchema>,
): Promise<AnalyseResult> {
  const parsed = deepSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "That post could not be read." };
  if (serverEnv.GEMINI_API_KEY === "") return { status: "unconfigured" };

  const user = await requireUser();
  if (!user) return { status: "denied", message: DENIAL_COPY.not_authenticated };

  const check = await canRunModel("discover.inspiration-deep");
  if (!check.allowed) return { status: "denied", message: DENIAL_COPY[check.reason] };

  const externalRef = `discover.inspiration-deep:${crypto.randomUUID()}`;
  const service = createServiceClient();
  const { data: debited, error: debitError } = await service.rpc("debit_model_credits", {
    p_user: user.id,
    p_model: "discover.inspiration-deep",
    p_external_ref: externalRef,
  });
  if (debitError !== null || debited !== true) {
    return { status: "denied", message: DENIAL_COPY.insufficient_credits };
  }

  const { platform, url, ...post } = parsed.data;
  const video = await fetchPostVideo(platform, url);
  if (video === null) {
    await service.rpc("refund_model_credits", { p_external_ref: externalRef });
    return {
      status: "error",
      message: "That video could not be fetched. Your credit was refunded.",
    };
  }

  const analysis = await analysePostDeep(post, video, await resolveIndustryLabel());
  if (analysis === null) {
    await service.rpc("refund_model_credits", { p_external_ref: externalRef });
    return {
      status: "error",
      message: "That video could not be analysed. Your credit was refunded.",
    };
  }

  return { status: "ok", analysis };
}
