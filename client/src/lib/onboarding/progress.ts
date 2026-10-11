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

/*
 * NOT CACHED, deliberately, and this is the second attempt at that.
 *
 * These six existence checks run on every dashboard navigation because this
 * lives in the layout, which is real cost worth removing. Wrapping it in
 * `unstable_cache` looked like the fix and took the whole dashboard down with a
 * 500: the queries run through the request-scoped Supabase client, that client
 * reads `cookies()`, and Next refuses to let a cached function touch request
 * data. The error is only reachable at runtime, so it built and deployed clean.
 *
 * The two ways out both have a cost. Caching means reading with the service
 * role, which bypasses row-level security and makes a `user_id` filter the only
 * thing standing between one person's progress and another's. Not caching means
 * six cheap indexed lookups per navigation, now in the same region as the
 * database.
 *
 * Six indexed reads is the cheaper mistake. Revisit with the service client only
 * if this shows up in real traces.
 */
export async function getOnboardingProgress(): Promise<OnboardingProgress> {
  if (!isSupabaseConfigured) return NOT_LIVE;

  const user = await getAuthUser();
  if (!user) return NOT_LIVE;

  const done = await readProgress(user.id);
  return { done: new Set(done), live: true };
}

/** The six checks themselves. */
async function readProgress(userId: string): Promise<OnboardingStepId[]> {
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
    const { data } = await supabase.from(table).select("id").eq("user_id", userId).limit(1);
    return (data?.length ?? 0) > 0;
  };

  const [industry, generated, edited, voiced, connected, published] = await Promise.all([
    supabase
      .from("profiles")
      .select("industry")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => typeof data?.industry === "string" && data.industry !== ""),
    owns("video_generations"),
    owns("editor_documents"),
    owns("voice_profiles"),
    owns("social_connections"),
    owns("scheduled_posts"),
  ]);

  const done: OnboardingStepId[] = [];
  if (industry) done.push("industry");
  if (generated) done.push("generate");
  if (edited) done.push("edit");
  if (voiced) done.push("voice");
  if (connected) done.push("connect");
  if (published) done.push("publish");

  // An array rather than a Set: the cache serialises this, and a Set does not
  // survive that round trip.
  return done;
}
