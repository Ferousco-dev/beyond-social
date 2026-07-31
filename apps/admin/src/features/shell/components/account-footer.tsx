import { type ReactNode } from "react";

import { type AdminIdentity } from "../types";

import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "./theme-toggle";

/**
 * The foot of the sidebar: who you are, the one preference worth changing
 * without leaving the page, and the way out.
 *
 * There is no account menu, because the console has no per-account settings of
 * its own. `admin` is null only when the session carries no usable email, which
 * the row states rather than papering over with a placeholder name.
 */
export function AccountFooter({ admin }: { admin: AdminIdentity | null }): ReactNode {
  return (
    <div className="border-t border-hairline p-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-cloud text-xs font-medium text-ink">
          {admin ? admin.initials : "?"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-ink">
            {admin ? admin.email : "Signed in"}
          </span>
          <span className="block truncate text-xs text-ink-soft">
            {admin ? "Administrator" : "Administrator, no email on this account"}
          </span>
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-sm text-ink">
        Theme
        <ThemeToggle />
      </div>
      <div className="mt-1">
        <SignOutButton />
      </div>
    </div>
  );
}
