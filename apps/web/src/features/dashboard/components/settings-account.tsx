"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { signOutAction } from "@/features/auth/actions";
import { CREDITS, type DashboardUser } from "@/lib/dashboard/data";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3.5 py-3">
      <span className="text-sm text-ink-soft">{label}</span>
      <span className="min-w-0 truncate text-sm text-ink">{value}</span>
    </div>
  );
}

export function AccountPanel({ user }: { user: DashboardUser }) {
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
    <div className="space-y-7">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-cloud text-sm font-medium text-ink">
          {user.initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{user.name}</p>
          <p className="truncate text-xs text-ink-soft">{user.email}</p>
        </div>
      </div>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Account details
        </h3>
        <div className="divide-y divide-hairline overflow-hidden rounded-xl border border-hairline">
          <Field label="Name" value={user.name} />
          <Field label="Email" value={user.email} />
          <Field label="Plan" value="Free" />
          <Field
            label="Credits"
            value={`${CREDITS.total - CREDITS.used} of ${CREDITS.total} remaining`}
          />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Session
        </h3>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={pending}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
        >
          <LogOut className="size-4" aria-hidden />
          {pending ? "Signing out..." : "Sign out"}
        </button>
      </section>
    </div>
  );
}
