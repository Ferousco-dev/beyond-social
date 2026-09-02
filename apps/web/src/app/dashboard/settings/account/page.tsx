import { type Metadata } from "next";

import { AccountForm } from "@/features/settings/components/account-form";
import { DangerZone } from "@/features/settings/components/danger-zone";
import { IndustryForm } from "@/features/settings/components/industry-form";
import { PasswordForm } from "@/features/settings/components/password-form";
import { TwinLibrary } from "@/features/live-avatar/components/twin-library";
import { listTwins } from "@/features/live-avatar/delete-actions";
import { getIndustry } from "@/lib/profile/industry";
import { getAccount } from "@/lib/settings/account";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const [account, industry, twins] = await Promise.all([getAccount(), getIndustry(), listTwins()]);

  return (
    <section className="mt-6 lg:mt-8">
      <AccountForm email={account.email} fullName={account.fullName} />
      <IndustryForm industry={industry} />
      <PasswordForm />
      {/* Above the danger zone, not inside it: deleting a likeness is a normal
          thing to want, and burying it with account deletion makes it read as
          the same severity. The consent statement promises it is here. */}
      <section className="mt-8 rounded-xl border border-hairline p-5">
        <h2 className="text-sm font-medium text-ink">Your avatars</h2>
        <p className="mt-1 mb-4 text-sm text-ink-soft">
          Trained copies of your face and voice, held here and at the provider that generates from
          them.
        </p>
        <TwinLibrary twins={twins} />
      </section>
      <DangerZone email={account.email} />
    </section>
  );
}
