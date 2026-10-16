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
  const user = await getCurrentUser();

  const [usage, projects] = await Promise.all([
    user.plan === "pro" ? goApi("/api/v1/usage", usageResponse) : Promise.resolve(null),
    getSidebarProjects(),
  ]);
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
