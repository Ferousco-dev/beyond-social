import { type ReactNode } from "react";

import { ConsoleShell } from "@/features/shell/components/console-shell";
import { adminIdentitySchema, type AdminIdentity } from "@/features/shell/types";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * Every console page renders inside the shell, and every one of them is behind
 * `requireAdmin`. The middleware refuses non-admins first, so this is the second
 * gate rather than the only one, and it is also where the shell gets the
 * identity it shows.
 */
export default async function ConsoleLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const { email } = await requireAdmin();

  // The console has no display names, so the avatar falls back to the email.
  const parsed = adminIdentitySchema.safeParse({
    email,
    initials: email.slice(0, 2).toUpperCase(),
  });
  const admin: AdminIdentity | null = parsed.success ? parsed.data : null;

  return <ConsoleShell admin={admin}>{children}</ConsoleShell>;
}
