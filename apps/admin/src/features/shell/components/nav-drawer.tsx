"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { type AdminIdentity } from "../types";

import { ConsoleSidebar } from "./console-sidebar";

/**
 * The navigation on a narrow viewport.
 *
 * Built on the native dialog element rather than a positioned div: below `lg`
 * this is the only route to the navigation, and `showModal` is what gives it a
 * focus trap, Escape to close, and an inert page behind it without shipping a
 * dialog library for one drawer.
 */
export function NavDrawer({
  open,
  admin,
  onClose,
}: {
  open: boolean;
  admin: AdminIdentity | null;
  onClose: () => void;
}): ReactNode {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label="Navigation"
      onClose={onClose}
      // Clicking the backdrop lands on the dialog element itself, since the
      // panel below fills it entirely.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-0 h-dvh max-h-none w-[min(280px,85vw)] max-w-none border-r border-hairline bg-paper p-0 text-ink backdrop:bg-black/40 lg:hidden"
    >
      <ConsoleSidebar admin={admin} onNavigate={onClose} />
    </dialog>
  );
}
