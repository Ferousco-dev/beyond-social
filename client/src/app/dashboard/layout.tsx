import { type ReactNode } from "react";

import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
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

  return (
    <DashboardShell user={user} projects={conversations} credits={{ balance: user.credits }}>
      {children}
    </DashboardShell>
  );
}
