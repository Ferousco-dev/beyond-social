"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import Link from "next/link";

import { signOutAction } from "@/features/auth/actions";
import { type DashboardUser } from "@/lib/dashboard/data";

export function UserButton({ user }: { user: DashboardUser }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await signOutAction();
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1 border-t border-hairline p-2">
      {/* A link, not a modal. Connecting a social account leaves for an OAuth
          round trip and comes back to a URL, which a dialog cannot receive, so
          settings has to be a real route. */}
      <Link
        href="/dashboard/settings"
        aria-label="Open settings"
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg p-1.5 text-left transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-cloud text-xs font-medium text-ink">
          {user.initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-ink">{user.name}</span>
          <span className="block truncate text-xs text-ink-soft">Free plan</span>
        </span>
      </Link>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={pending}
        aria-label="Sign out"
        className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cloud hover:text-ink disabled:opacity-50"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}
