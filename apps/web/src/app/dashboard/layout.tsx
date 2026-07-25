import { type ReactNode } from "react";

import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { getCurrentUser } from "@/lib/dashboard/current-user";
import { getSidebarProjects } from "@/lib/dashboard/queries";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, projects] = await Promise.all([getCurrentUser(), getSidebarProjects()]);

  return (
    <DashboardShell user={user} projects={projects}>
      {children}
    </DashboardShell>
  );
}
