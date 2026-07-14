import Link from "next/link";
import { type Metadata } from "next";

import { AuthHeader } from "@/features/auth/components/auth-header";
import { OtpForm } from "@/features/auth/components/otp-form";

export const metadata: Metadata = { title: "Verify email" };

export default function VerifyPage() {
  return (
    <div className="flex flex-col gap-6">
      <AuthHeader
        title="Check your email"
        subtitle="Enter the 6-digit code we sent to confirm your email address."
      />
      <OtpForm />
      <p className="text-center text-sm text-muted-foreground">
        Wrong email?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Start over
        </Link>
      </p>
    </div>
  );
}
