import { type Metadata } from "next";

import { AccountForm } from "@/features/settings/components/account-form";
import { DangerZone } from "@/features/settings/components/danger-zone";
import { IndustryForm } from "@/features/settings/components/industry-form";
import { PasswordForm } from "@/features/settings/components/password-form";
import { TwinSettingsCard } from "@/features/live-avatar/components/twin-settings-card";
import { getTwin } from "@/features/live-avatar/delete-actions";
import { getIndustry } from "@/lib/profile/industry";
import { getAccount } from "@/lib/settings/account";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const [account, industry, twin] = await Promise.all([getAccount(), getIndustry(), getTwin()]);

  return (
    <section className="mt-6 lg:mt-8">
      <AccountForm email={account.email} fullName={account.fullName} />
      <IndustryForm industry={industry} />
      <PasswordForm />
      {/* Above the danger zone, not inside it: deleting a likeness is a normal
          thing to want, and burying it with account deletion makes it read as
          the same severity. The consent statement promises it is here. */}
      <TwinSettingsCard twin={twin} />
      <DangerZone email={account.email} />
    </section>
  );
}
