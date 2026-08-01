"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal, Pencil, RefreshCw } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

const MENU_ITEM =
  "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-cloud";

/**
 * The overflow menu on a finished draft.
 *
 * Regenerate lives behind the menu rather than beside the play control on
 * purpose: it spends credits on every press, and a one-tap button next to a
 * play button is too easy to hit by accident.
 */
export function DraftMenu({
  editorHref,
  onRegenerate,
  busy,
}: {
  editorHref: Route;
  onRegenerate?: () => void;
  busy?: boolean;
}): ReactNode {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        // 32px of hit target inside a 176px tile, which is the smallest this
        // can be without becoming hard to hit on a phone.
        className="inline-flex size-8 items-center justify-center rounded-full bg-paper/90 text-ink shadow-card outline-none backdrop-blur transition-opacity focus-visible:ring-2 focus-visible:ring-ink/20 disabled:opacity-50"
        aria-label="Draft options"
        disabled={busy}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-44 rounded-xl border border-hairline bg-paper p-1 shadow-card"
        >
          <DropdownMenu.Item asChild className={MENU_ITEM}>
            <Link href={editorHref}>
              <Pencil className="size-4 text-ink-soft" aria-hidden />
              Open in editor
            </Link>
          </DropdownMenu.Item>

          {onRegenerate ? (
            <DropdownMenu.Item className={MENU_ITEM} onSelect={onRegenerate} disabled={busy}>
              <RefreshCw className="size-4 text-ink-soft" aria-hidden />
              Regenerate
            </DropdownMenu.Item>
          ) : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
