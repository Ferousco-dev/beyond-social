import { type Metadata } from "next";

import { AuthHeader } from "@/features/auth/components/auth-header";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Set new password" };

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <AuthHeader
        title="Set a new password"
        subtitle="Choose a strong password you have not used before."
      />
      <ResetPasswordForm />
    </div>
  );
}
