import Link from "next/link";
import { type Metadata } from "next";

import { AuthHeader } from "@/features/auth/components/auth-header";
import { OrDivider } from "@/features/auth/components/or-divider";
import { SignupForm } from "@/features/auth/components/signup-form";
import { SocialAuthButtons } from "@/features/auth/components/social-auth-buttons";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <AuthHeader
        title="Create your account"
        subtitle="Start creating and publishing AI video in minutes."
      />
      <SocialAuthButtons />
      <OrDivider label="or sign up with email" />
      <SignupForm />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
