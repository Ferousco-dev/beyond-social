import { redirect } from "next/navigation";

import { getCurrentPlan } from "@/lib/billing/current-plan";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { isSupabaseConfigured } from "@/lib/env";
import { getAuthUser } from "@/lib/supabase/session";

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
  plan: "free",
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
  // uses, so this costs nothing beyond the first caller.
  const plan = asPlanId(await getCurrentPlan());
  return { name, email: authUser.email ?? "", initials: toInitials(name), plan };
}
