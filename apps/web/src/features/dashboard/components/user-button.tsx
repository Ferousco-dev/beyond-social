"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronsUpDown, LogOut, Settings, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";

import { useConfirm } from "@/components/ui/use-confirm";
import { signOutAction } from "@/features/auth/actions";
import { ThemeToggle } from "@/features/settings/components/theme-toggle";
import { type DashboardUser } from "@/lib/dashboard/data";
import { cn } from "@/lib/utils";

/**
 * The account menu at the foot of the sidebar.
 *
 * The footer used to be a link to settings with a sign-out icon bolted beside
 * it, which gave two unrelated controls equal weight and left everything else
 * about the account reachable only by navigating first. This groups them: who
 * you are, where the account lives, the one preference worth changing without
 * leaving, and the way out.
 *
 * Every row leads somewhere real. There is no credits row, because the product
 * does not meter credits, and no referral or feedback row, because there is
 * nothing behind either.
 */

const ROW =
  "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm text-ink outline-none transition-colors data-highlighted:bg-cloud";

const ICON = "size-4 shrink-0 text-ink-soft";

function Avatar({ initials }: { initials: string }): ReactNode {
  return (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-cloud text-xs font-medium text-ink">
      {initials}
    </span>
  );
}

export function UserButton({ user, compact = false }: { user: DashboardUser; compact?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const { confirm, dialog } = useConfirm();

  // Signing out costs nothing but a sign in, so the wording stays light and the
  // confirm button is an ordinary one. The dialog exists because the control
  // sits one slip below "Plan", not because the action is dangerous.
  async function handleSignOut() {
    const confirmed = await confirm({
      title: "Sign out?",
      description:
        "You will be sent back to the sign in page. Nothing is deleted, and signing back in brings you straight to where you left off.",
      confirmLabel: "Sign out",
      tone: "neutral",
    });
    if (!confirmed) return;

    setMenuOpen(false);
    startTransition(async () => {
      await signOutAction();
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <div className={compact ? "" : "border-t border-hairline p-2"}>
      {dialog}
      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        {/* Named explicitly: the visible text is the account name, which does
            not say what the control does. In the collapsed rail there is no
            visible text at all, so the label is the only name it has. */}
        <DropdownMenu.Trigger
          aria-label="Account menu"
          className={cn(
            "flex cursor-pointer items-center rounded-lg text-left transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[state=open]:bg-cloud",
            compact ? "w-full justify-center p-1.5" : "w-full gap-2 p-1.5",
          )}
        >
          <Avatar initials={user.initials} />
          {compact ? null : (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">{user.name}</span>
                <span className="block truncate text-xs text-ink-soft">Free plan</span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-ink-soft" aria-hidden />
            </>
          )}
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side="top"
            align="start"
            sideOffset={8}
            // Sized from the trigger, so the panel reads as an expansion of the
            // row it came from rather than a floating card of its own. In the
            // collapsed rail the trigger is an avatar, so the minimum carries it.
            className="z-50 w-[var(--radix-dropdown-menu-trigger-width)] min-w-64 overflow-hidden rounded-xl border border-hairline bg-paper shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-1"
          >
            <div className="flex items-center gap-3 px-3 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{user.name}</span>
                <span className="block truncate text-xs text-ink-soft">{user.email}</span>
              </span>
              <Avatar initials={user.initials} />
            </div>

            <DropdownMenu.Separator className="h-px bg-hairline" />

            {/* Links, not dialogs. Connecting a social account leaves for an
                OAuth round trip and comes back to a URL, which a menu cannot
                receive, so these have to be real routes. */}
            <div className="p-1.5">
              <DropdownMenu.Item asChild>
                <Link href="/dashboard/settings" className={ROW}>
                  Settings
                  <Settings className={ICON} aria-hidden />
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link href="/dashboard/settings/connections" className={ROW}>
                  Connections
                  <Share2 className={ICON} aria-hidden />
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link href="/dashboard/settings/billing" className={ROW}>
                  Plan
                  <span className="text-xs text-ink-soft">Free</span>
                </Link>
              </DropdownMenu.Item>
            </div>

            <DropdownMenu.Separator className="h-px bg-hairline" />

            {/* Changed in place: leaving the menu to switch theme is the kind of
                trip that makes people stop bothering. */}
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-ink">
              Theme
              <ThemeToggle />
            </div>

            <DropdownMenu.Separator className="h-px bg-hairline" />

            <div className="p-1.5">
              <DropdownMenu.Item
                disabled={pending}
                // The menu is held open behind the dialog so that cancelling
                // returns focus to this row rather than to nothing.
                onSelect={(event) => {
                  event.preventDefault();
                  void handleSignOut();
                }}
                className={`${ROW} data-disabled:cursor-default data-disabled:opacity-50`}
              >
                Sign out
                <LogOut className={ICON} aria-hidden />
              </DropdownMenu.Item>
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
