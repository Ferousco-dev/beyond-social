import { type Metadata } from "next";

import { AccountForm } from "@/features/settings/components/account-form";
import { DangerZone } from "@/features/settings/components/danger-zone";
import { PasswordForm } from "@/features/settings/components/password-form";
import { getCurrentUser } from "@/lib/dashboard/current-user";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();

  return (
    <section className="mt-6 lg:mt-8">
      <AccountForm email={user.email} fullName={user.name} />
      <PasswordForm />
      <DangerZone email={user.email} subscribed={user.plan === "pro"} />
    </section>
  );
}
