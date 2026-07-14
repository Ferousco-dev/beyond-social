import { redirect } from "next/navigation";
import { type ReactNode } from "react";

import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { isSupabaseConfigured } from "@/lib/env";
import { type DashboardUser } from "@/lib/dashboard/data";
import { createClient } from "@/lib/supabase/server";

function toInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Placeholder identity until Supabase is configured.
  let user: DashboardUser = { name: "Alex Rivera", email: "alex@studio.com", initials: "AR" };

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) redirect("/login");

    const metadataName = authUser.user_metadata.full_name;
    const name = typeof metadataName === "string" ? metadataName : (authUser.email ?? "there");
    user = { name, email: authUser.email ?? "", initials: toInitials(name) };
  }

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
