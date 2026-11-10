import { type ReactNode } from "react";

import { UsageBanner } from "@/features/billing/usage-banner";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { goApi } from "@/lib/go-api/client";
import { usageResponse } from "@/lib/go-api/schemas";
import { getCurrentUser } from "@/lib/dashboard/current-user";
import { getSidebarProjects } from "@/lib/dashboard/conversations";

/**
 * The signed-in frame around every dashboard page.
 *
 * The shell loads the active user's plan and credit balance from the Go API.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // The sidebar's projects do not depend on the account, so they load with it.
  // Pro usage only has to wait to learn the plan, and it starts the moment the
  // user is known rather than after the sidebar finishes too, so a slow sidebar
  // never delays it (no extra calls: free accounts still skip it).
  const userRequest = getCurrentUser();
  const usageRequest = userRequest.then((account) =>
    account.plan === "pro" ? goApi("/api/v1/usage", usageResponse) : null,
  );
  const [user, projects, usage] = await Promise.all([userRequest, getSidebarProjects(), usageRequest]);
  const bars = usage?.ok
    ? {
        fiveHour: { used: usage.data.data.usage.five_hour_used, limit: usage.data.data.usage.five_hour_limit, resetsAt: usage.data.data.usage.five_hour_resets_at },
        week: { used: usage.data.data.usage.week_used, limit: usage.data.data.usage.week_limit, resetsAt: usage.data.data.usage.week_resets_at },
      }
    : null;
  const summary = user.credits === null ? null : { balance: user.credits, plan: user.plan, usage: bars };

  return (
    <DashboardShell user={user} credits={summary} projects={projects}>
      <UsageBanner credits={summary} />
      {children}
    </DashboardShell>
  );
}
