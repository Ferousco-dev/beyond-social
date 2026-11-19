import { type Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthHeader } from "@/features/auth/components/auth-header";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Set new password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token_hash?: string }> }) {
  const { token_hash: tokenHash } = await searchParams;
  // Without the emailed token there is nothing to reset with: ask for a new link.
  if (!tokenHash) redirect("/forgot-password?error=expired");
  return (
    <div className="flex flex-col gap-6">
      <AuthHeader
        title="Set a new password"
        subtitle="Choose a strong password you have not used before."
      />
      <ResetPasswordForm tokenHash={tokenHash} />
    </div>
  );
}
