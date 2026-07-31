"use client";

import { LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";
import { type ReactNode } from "react";

import { signOutAction } from "@/lib/auth/actions";

/**
 * Ending the session is a state change like any other here, so it goes through
 * the server action that writes `admin.sign_out` to the audit log before the
 * session is torn down. There is no client-side sign-out path that would skip
 * that write.
 */
export function SignOutButton(): ReactNode {
  return (
    <form action={signOutAction}>
      <Submit />
    </form>
  );
}

function Submit(): ReactNode {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-sm text-ink-soft transition-colors pointer-coarse:h-11 hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
    >
      <LogOut className="size-4 shrink-0" aria-hidden />
      {pending ? "Signing out" : "Sign out"}
    </button>
  );
}
