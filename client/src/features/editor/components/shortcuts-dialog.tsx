"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { ACCEL, EDITOR_SHORTCUTS, accelerator } from "../lib/shortcuts";

/**
 * What the keyboard can do here.
 *
 * The editor bound a dozen shortcuts and advertised none of them, so the only
 * way to find out that S splits and Delete removes was to press them and watch.
 * Opened with `?`, which is the convention, and from the toolbar for anyone who
 * would never guess that.
 */
export function ShortcutsDialog({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  /*
   * Resolved after mount rather than during render. `navigator` does not exist
   * on the server, and a key cap that says Ctrl on the first paint and ⌘ on the
   * second is a hydration mismatch over a single character.
   */
  const [accel, setAccel] = useState("Ctrl");
  useEffect(() => setAccel(accelerator()), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "?" || event.metaKey || event.ctrlKey || event.altKey) return;
      // Not while someone is typing a message, where `?` is punctuation.
      const target = event.target;
      if (target instanceof HTMLElement) {
        if (target.isContentEditable) return;
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      }

      event.preventDefault();
      setOpen((current) => !current);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children ? <Dialog.Trigger asChild>{children}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-hairline bg-paper text-ink shadow-card focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <div className="flex items-start justify-between border-b border-hairline px-6 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold">Keyboard shortcuts</Dialog.Title>
              <Dialog.Description className="text-sm text-ink-soft">
                Press ? at any time to open this.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="px-6 py-5">
            {EDITOR_SHORTCUTS.map((group) => (
              <section key={group.title} className="mt-6 first:mt-0">
                <h3 className="text-xs font-medium uppercase tracking-[0.08em] text-ink-soft">
                  {group.title}
                </h3>
                <dl className="mt-3 space-y-2">
                  {group.shortcuts.map((shortcut) => (
                    <div key={shortcut.action} className="flex items-center justify-between gap-4">
                      <dt className="text-sm text-ink">{shortcut.action}</dt>
                      <dd className="flex shrink-0 gap-1">
                        {shortcut.keys.map((key) => (
                          <kbd
                            key={key}
                            className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-hairline bg-cloud px-1.5 text-xs font-medium text-ink-soft"
                          >
                            {key === ACCEL ? accel : key}
                          </kbd>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
