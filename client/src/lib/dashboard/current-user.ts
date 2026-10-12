import { redirect } from "next/navigation";
import { cache } from "react";

import { goApi } from "@/lib/go-api/client";
import { meResponse } from "@/lib/go-api/schemas";
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
  avatarUrl: null,
  plan: "free",
  isAdmin: false,
};

/**
 * The signed-in user, as the Go API sees them.
 *
 * The session proves who they are; the API decides whether the account is in
 * good standing and creates their profile on first use. A suspended or deleted
 * account is refused there, so the rule holds for the whole product instead of
 * only for screens that remember to check.
 */
export const getCurrentUser = cache(async (): Promise<DashboardUser> => {
  if (!isSupabaseConfigured) return PLACEHOLDER;

  const authUser = await getAuthUser();
  if (!authUser) redirect("/login");

  const fallbackName =
    typeof authUser.user_metadata.full_name === "string" ? authUser.user_metadata.full_name : null;

  const me = await goApi("/api/v1/me", meResponse);
  if (!me.ok) {
    if (me.code === "account_deleted") redirect("/account-deleted");
    if (me.code === "unauthorized") redirect("/login");
    // The API being unreachable should not log anybody out: show who the
    // session says they are, and let the actions that need the API say so.
    const name = fallbackName ?? authUser.email ?? "there";
    return { ...PLACEHOLDER, name, email: authUser.email ?? "", initials: toInitials(name) };
  }

  const name = me.data.data.name || fallbackName || me.data.data.email || "there";
  return {
    name,
    email: me.data.data.email,
    initials: toInitials(name),
    avatarUrl: null,
    plan: "free",
    isAdmin: me.data.data.role === "admin",
  };
});
