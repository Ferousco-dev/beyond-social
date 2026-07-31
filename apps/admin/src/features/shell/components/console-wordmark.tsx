import Link from "next/link";
import { type ReactNode } from "react";

/**
 * Typography only, no mark. The product logo is a brand asset that does not
 * exist in this app, and an internal console does not need one: the point of
 * the wordmark here is to make it obvious, at a glance, that this is the
 * console and not the customer facing product.
 */
export function ConsoleWordmark(): ReactNode {
  return (
    <Link
      href="/overview"
      className="flex items-center gap-2 rounded-lg px-1 py-1 text-sm font-semibold tracking-tight text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      Beyond Social
      <span className="rounded-full border border-hairline px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-ink-soft uppercase">
        Admin
      </span>
    </Link>
  );
}
