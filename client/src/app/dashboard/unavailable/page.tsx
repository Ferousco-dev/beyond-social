import { type Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Coming back soon" };

/**
 * Where a feature that is being moved to the new backend lands. It says so
 * plainly rather than showing an error, and points at what works today.
 */
export default function UnavailablePage() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-semibold tracking-[-0.02em] text-ink">This is being rebuilt</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        We are moving this part of the product to a new, faster backend. It is switched off for now
        and will be back. Discover and your avatar are working.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/dashboard/trends"
          className="btn btn-primary btn-md"
        >
          Go to Discover
        </Link>
        <Link
          href="/dashboard/assets"
          className="btn btn-secondary btn-md"
        >
          Your avatar
        </Link>
      </div>
    </div>
  );
}
