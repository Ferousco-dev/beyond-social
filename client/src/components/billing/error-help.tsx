import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

/** Where to send someone whose request was stopped by a limit, by the reason the server gave. */
const HELP: Readonly<Record<string, { readonly href: string; readonly label: string }>> = {
  usage_limit: { href: "/dashboard/usage", label: "See your usage" },
  upgrade_required: { href: "/pricing", label: "Upgrade to Pro" },
  insufficient_credits: { href: "/dashboard/credits", label: "Get more credits" },
  daily_limit: { href: "/dashboard/usage", label: "See your usage" },
};

export function ErrorHelp({ code, className }: { readonly code?: string; readonly className?: string }): ReactNode {
  const help = code ? HELP[code] : undefined;
  if (!help) return null;
  return (
    <Link href={help.href as Route} className={className ?? "text-sm font-medium text-ink underline underline-offset-2"}>
      {help.label}
    </Link>
  );
}
