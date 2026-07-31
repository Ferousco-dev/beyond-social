import { type Metadata } from "next";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

type PageProps = { searchParams: Promise<{ redirect?: string }> };

export default async function SignInPage({ searchParams }: PageProps): Promise<React.ReactElement> {
  const { redirect } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Beyond Social Admin</h1>
        <p className="text-sm text-muted-foreground">
          Sign in with an account that has console access.
        </p>
      </div>
      <SignInForm redirectTo={redirect} />
    </div>
  );
}
