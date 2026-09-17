import Link from "next/link";
import { type Metadata } from "next";

import { AuthHeader } from "@/features/auth/components/auth-header";
import { LoginForm } from "@/features/auth/components/login-form";
// OAuth controls are paused while password authentication is being verified.
// import { OrDivider } from "@/features/auth/components/or-divider";
// import { SocialAuthButtons } from "@/features/auth/components/social-auth-buttons";
// import { enabledProviders } from "@/features/auth/providers";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <AuthHeader title="Welcome back" subtitle="Sign in to your Beyond Social workspace." />
      {/* OAuth controls are intentionally paused. Keep this block for re-enabling after auth is verified.
      {enabledProviders().length > 0 ? (
        <>
          <SocialAuthButtons />
          <OrDivider label="or continue with email" />
        </>
      ) : null} */}
      <LoginForm />
      <p className="text-center text-sm text-muted-foreground">
        New to Beyond Social?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
