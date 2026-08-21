import { type Metadata } from "next";

import { AccountForm } from "@/features/settings/components/account-form";
import { DangerZone } from "@/features/settings/components/danger-zone";
import { IndustryForm } from "@/features/settings/components/industry-form";
import { PasswordForm } from "@/features/settings/components/password-form";
import { getIndustry } from "@/lib/profile/industry";
import { getAccount } from "@/lib/settings/account";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const [account, industry] = await Promise.all([getAccount(), getIndustry()]);

  return (
    <section className="mt-6 lg:mt-8">
      <AccountForm email={account.email} fullName={account.fullName} />
      <IndustryForm industry={industry} />
      <PasswordForm />
      <DangerZone email={account.email} />
    </section>
  );
}
