import { redirect } from "next/navigation";

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
};

export async function getCurrentUser(): Promise<DashboardUser> {
  if (!isSupabaseConfigured) return PLACEHOLDER;

  const authUser = await getAuthUser();
  if (!authUser) redirect("/login");

  const metadataName = authUser.user_metadata.full_name;
  const name = typeof metadataName === "string" ? metadataName : (authUser.email ?? "there");
  return { name, email: authUser.email ?? "", initials: toInitials(name) };
}
