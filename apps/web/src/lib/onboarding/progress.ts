import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/session";

import { type OnboardingStepId } from "./steps";

/**
 * Which steps this account has actually completed.
 *
 * Derived from the user's own rows rather than from a flag we set when they
 * clicked something. A checklist that records intent drifts from reality the
 * first time an action half fails, and then it is lying to the person it is
 * meant to be helping.
 *
 * Six cheap existence checks, run together. Each is `limit 1` and selects one
 * column, so none of them reads a row it does not need.
 */

export interface OnboardingProgress {
  readonly done: ReadonlySet<OnboardingStepId>;
  /** False when there is no backend, so the checklist stays hidden. */
  readonly live: boolean;
}

const NOT_LIVE: OnboardingProgress = { done: new Set(), live: false };

export async function getOnboardingProgress(): Promise<OnboardingProgress> {
  if (!isSupabaseConfigured) return NOT_LIVE;

  const user = await getAuthUser();
  if (!user) return NOT_LIVE;

  const supabase = await createClient();

  /** True when the user owns at least one row in the table. */
  const owns = async (
    table:
      | "video_generations"
      | "editor_documents"
      | "voice_profiles"
      | "social_connections"
      | "scheduled_posts",
  ): Promise<boolean> => {
    const { data } = await supabase.from(table).select("id").eq("user_id", user.id).limit(1);
    return (data?.length ?? 0) > 0;
  };

  const [industry, generated, edited, voiced, connected, published] = await Promise.all([
    supabase
      .from("profiles")
      .select("industry")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => typeof data?.industry === "string" && data.industry !== ""),
    owns("video_generations"),
    owns("editor_documents"),
    owns("voice_profiles"),
    owns("social_connections"),
    owns("scheduled_posts"),
  ]);

  const done = new Set<OnboardingStepId>();
  if (industry) done.add("industry");
  if (generated) done.add("generate");
  if (edited) done.add("edit");
  if (voiced) done.add("voice");
  if (connected) done.add("connect");
  if (published) done.add("publish");

  return { done, live: true };
}
