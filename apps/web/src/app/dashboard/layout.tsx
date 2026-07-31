import { type ReactNode } from "react";

import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { TimezoneSync } from "@/features/settings/components/timezone-sync";
import { getCurrentUser } from "@/lib/dashboard/current-user";
import { getSidebarProjects } from "@/lib/dashboard/queries";
import { getUserTimeZone } from "@/lib/time/user-zone";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, projects, timeZone] = await Promise.all([
    getCurrentUser(),
    getSidebarProjects(),
    getUserTimeZone(),
  ]);

  return (
    <DashboardShell user={user} projects={projects}>
      {/* Reads the device zone and stores it when it differs, so nobody has to
          pick their own timezone out of a list of six hundred. */}
      <TimezoneSync current={timeZone} />
      {children}
    </DashboardShell>
  );
}
