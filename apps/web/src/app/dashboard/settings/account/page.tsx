import { type Metadata } from "next";

import { AccountForm } from "@/features/settings/components/account-form";
import { PasswordForm } from "@/features/settings/components/password-form";
import { getAccount } from "@/lib/settings/account";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const account = await getAccount();

  return (
    <section className="mt-8">
      <AccountForm email={account.email} fullName={account.fullName} />
      <PasswordForm />
    </section>
  );
}
