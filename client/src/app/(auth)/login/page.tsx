import Link from "next/link";
import { type Metadata } from "next";

import { FormStatus } from "@/features/auth/components/form-status";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const { reset } = await searchParams;
  return (
    <div className="flex flex-col gap-6">
      <AuthHeader title="Welcome back" subtitle="Sign in to your Beyond Social workspace." />
      {reset === "done" ? <FormStatus status="success" message="Password updated. Sign in with your new password." /> : null}
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
