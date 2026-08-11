import "server-only";

import { unstable_cache } from "next/cache";

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

/**
 * How long a completed step can look incomplete.
 *
 * Six existence checks ran on every dashboard navigation, because this is in the
 * layout and the layout renders on every page. That is six round trips to
 * Stockholm to decide whether a checklist should show a tick.
 *
 * A minute is the trade: ticking a step a moment late is a checklist being
 * slightly stale, which nobody notices, and the alternative was making every
 * page in the product wait for it.
 */
const CACHE_SECONDS = 60;

export async function getOnboardingProgress(): Promise<OnboardingProgress> {
  if (!isSupabaseConfigured) return NOT_LIVE;

  const user = await getAuthUser();
  if (!user) return NOT_LIVE;

  // Keyed by user, so one person's progress can never be served to another.
  const cached = unstable_cache(() => readProgress(user.id), ["onboarding-progress", user.id], {
    revalidate: CACHE_SECONDS,
    tags: [`onboarding:${user.id}`],
  });

  const done = await cached();
  return { done: new Set(done), live: true };
}

/** The six checks themselves, run only on a cache miss. */
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
