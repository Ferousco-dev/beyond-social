import { type ReactNode } from "react";

import { UsageBanner } from "@/features/billing/usage-banner";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { goApi } from "@/lib/go-api/client";
import { usageResponse } from "@/lib/go-api/schemas";
import { getCurrentUser } from "@/lib/dashboard/current-user";
import { getSidebarConversations } from "@/lib/dashboard/conversations";

/**
 * The signed-in frame around every dashboard page.
 *
 * Recent chats and the credit balance come from the Go API. The shell never
 * reads the database itself.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, conversations] = await Promise.all([getCurrentUser(), getSidebarConversations()]);

  const usage = user.plan === "pro" ? await goApi("/api/v1/usage", usageResponse) : null;
  const bars = usage?.ok
    ? {
        fiveHour: { used: usage.data.data.usage.five_hour_used, limit: usage.data.data.usage.five_hour_limit, resetsAt: usage.data.data.usage.five_hour_resets_at },
        week: { used: usage.data.data.usage.week_used, limit: usage.data.data.usage.week_limit, resetsAt: usage.data.data.usage.week_resets_at },
      }
    : null;
  const summary = user.credits === null ? null : { balance: user.credits, plan: user.plan, usage: bars };

  return (
    <DashboardShell user={user} projects={conversations} credits={summary}>
      <UsageBanner credits={summary} />
      {children}
    </DashboardShell>
  );
}
