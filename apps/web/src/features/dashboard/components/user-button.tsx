"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

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
    <div className="flex items-center gap-2 border-t border-hairline p-2">
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-cloud text-xs font-medium text-ink">
        {user.initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-ink">{user.name}</p>
        <p className="truncate text-xs text-ink-soft">Free plan</p>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={pending}
        aria-label="Sign out"
        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cloud hover:text-ink disabled:opacity-50"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}
