import { type Metadata } from "next";
import Link from "next/link";

import { SignOutButton } from "@/features/shell/components/sign-out-button";
import { assuranceOf, MFA_ENROL_PATH } from "@/lib/auth/mfa";
import { createClient } from "@/lib/auth/supabase";

import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Two-factor" };

/**
 * The step-up screen, and the one place a session that cannot prove itself is
 * allowed to land. It is exempt from the assurance gate, so it must always
 * offer a way forward: a code, a link to enrol, or a way out.
 */
export default async function VerifyPage(): Promise<React.ReactElement> {
  const outcome = await assuranceOf(await createClient());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Two-factor</h1>
        <p className="text-sm text-muted-foreground">
          {outcome.state === "enrol"
            ? "This account has no authenticator set up yet."
            : "Enter the code from your authenticator app to continue."}
        </p>
      </div>

      {outcome.state === "enrol" ? (
        <Link
          href={MFA_ENROL_PATH}
          className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Set one up
        </Link>
      ) : (
        <VerifyForm />
      )}

      {outcome.state === "unknown" ? (
        <p className="text-sm text-muted-foreground">
          The console could not check this session&apos;s security level. Sign out and in again; if
          it keeps happening, the sign-in backend is the place to look.
        </p>
      ) : null}

      <div className="border-t border-hairline pt-4">
        <SignOutButton />
      </div>
    </div>
  );
}
