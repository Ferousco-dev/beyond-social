import { redirect } from "next/navigation";
import { type Metadata } from "next";

import { Logo } from "@/components/brand/logo";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/features/auth/components/sign-out-button";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  let email = "there";

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    email = user.email ?? "there";
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 lg:px-8">
          <Logo />
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <p className="text-sm font-medium text-primary">Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Welcome, {email}</h1>
        <p className="mt-3 max-w-lg text-muted-foreground">
          This is a protected route. The full workspace with projects, credits, and the publishing
          queue will live here.
        </p>
      </main>
    </div>
  );
}
