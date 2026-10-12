import { type ReactNode } from "react";

import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getCurrentUser } from "@/lib/dashboard/current-user";

/**
 * The signed-in frame around every dashboard page.
 *
 * Projects, the credit balance and the onboarding checklist used to be read
 * here straight from the database. They belong to features that are being moved
 * to the Go API (chat, credits), so for now the shell shows neither and the
 * pages that exist are the ones that run on the new backend.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <DashboardShell user={user} projects={[]} credits={{ balance: user.credits }}>
      {children}
    </DashboardShell>
  );
}
