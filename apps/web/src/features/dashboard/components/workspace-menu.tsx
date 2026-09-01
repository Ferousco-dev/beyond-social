"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, LayoutDashboard, PenSquare } from "lucide-react";
import Link from "next/link";

const MENU_ITEM =
  "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-cloud";

export function WorkspaceMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex min-h-9 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-sm font-medium text-ink transition-colors pointer-coarse:min-h-11 hover:bg-cloud"
        >
          {/* Held on one line: at 320px the name wrapped and doubled the
              height of the header it sits in. */}
          Beyond Social
          <ChevronDown className="size-4 text-ink-soft" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 w-56 rounded-xl border border-hairline bg-paper p-1 text-ink shadow-card data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DropdownMenu.Item asChild className={MENU_ITEM}>
            <Link href="/dashboard">
              <PenSquare className="size-4 text-ink-soft" />
              New project
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={MENU_ITEM}>
            <Link href="/dashboard/overview">
              <LayoutDashboard className="size-4 text-ink-soft" />
              Dashboard
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
