import { redirect } from "next/navigation";

import { getCurrentPlan } from "@/lib/billing/current-plan";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { isSupabaseConfigured } from "@/lib/env";
import { getAuthUser } from "@/lib/supabase/session";
import { createClient } from "@/lib/supabase/server";

import { isAdmin } from "./admin";
import { type DashboardUser } from "./data";

function toInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Placeholder identity until Supabase is configured. */
const PLACEHOLDER: DashboardUser = {
  name: "Alex Rivera",
  email: "alex@studio.com",
  initials: "AR",
  avatarUrl: null,
  plan: "free",
  isAdmin: false,
};

/** Anything unrecognised reads as free, which is the safe thing to display. */
function asPlanId(value: string): PlanId {
  return (PLANS as readonly string[]).includes(value) ? (value as PlanId) : "free";
}

export async function getCurrentUser(): Promise<DashboardUser> {
  if (!isSupabaseConfigured) return PLACEHOLDER;

  const authUser = await getAuthUser();
  if (!authUser) redirect("/login");

  const metadataName = authUser.user_metadata.full_name;
  const name = typeof metadataName === "string" ? metadataName : (authUser.email ?? "there");
  // The plan comes from the same request-scoped read the rest of the dashboard
  // uses, so this costs nothing beyond the first caller. The admin check rides
  // alongside it for the same reason: this is the one place that already
  // builds the identity every page reads, so it is where the account menu's
  // admin row gets its answer rather than a second lookup nearer the menu.
  const supabase = await createClient();
  const [plan, admin, profile] = await Promise.all([
    getCurrentPlan(),
    isAdmin(),
    supabase.from("profiles").select("avatar_url").eq("id", authUser.id).maybeSingle(),
  ]);
  const avatarPath = profile.data?.avatar_url;
  const { data: signedAvatar } = avatarPath
    ? await supabase.storage.from("profile-avatars").createSignedUrl(avatarPath, 2 * 60 * 60)
    : { data: null };
  return {
    name,
    email: authUser.email ?? "",
    initials: toInitials(name),
    avatarUrl: signedAvatar?.signedUrl ?? null,
    plan: asPlanId(plan),
    isAdmin: admin,
  };
}
