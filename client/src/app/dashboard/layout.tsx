import { type ReactNode } from "react";

import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { OnboardingChecklist } from "@/features/onboarding/components/onboarding-checklist";
import { TimezoneSync } from "@/features/settings/components/timezone-sync";
import { getCurrentUser } from "@/lib/dashboard/current-user";
import { getCredits, getSidebarProjects } from "@/lib/dashboard/queries";
import { getOnboardingProgress } from "@/lib/onboarding/progress";
import { isBillingConfigured } from "@/lib/server-env";
import { getUserTimeZone } from "@/lib/time/user-zone";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, projects, credits, timeZone, onboarding] = await Promise.all([
    getCurrentUser(),
    getSidebarProjects(),
    getCredits(),
    getUserTimeZone(),
    getOnboardingProgress(),
  ]);

  return (
    <DashboardShell
      user={user}
      projects={projects}
      credits={credits}
      checkoutReady={isBillingConfigured}
    >
      {/* Reads the device zone and stores it when it differs, so nobody has to
          pick their own timezone out of a list of six hundred. */}
      <TimezoneSync current={timeZone} />
      {children}
      {/* In the layout rather than on the home page: the steps lead across the
          whole product, and a checklist that vanishes the moment you follow one
          of its own links is no use. */}
      {onboarding.live ? <OnboardingChecklist done={[...onboarding.done]} /> : null}
    </DashboardShell>
  );
}
