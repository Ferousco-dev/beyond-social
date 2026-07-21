import Link from "next/link";
import { type Metadata } from "next";

import { AuthHeader } from "@/features/auth/components/auth-header";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <AuthHeader
        title="Reset your password"
        subtitle="Enter your email and we will send you a secure reset link."
      />
      <ForgotPasswordForm />
      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
