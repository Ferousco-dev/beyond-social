"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, Package, UserRound } from "lucide-react";
import { useState } from "react";

import { type BrandAsset, type BrandLibrary } from "@/lib/assets/brand";
import { cn } from "@/lib/utils";

/**
 * Picking from the saved pictures.
 *
 * Multi-select, because the useful case is a person holding a product and that
 * is two pictures. Confirmed rather than attached on click for the same reason:
 * closing after the first tap would make the two-picture case impossible.
 */
export function PicturePicker({
  library,
  open,
  onOpenChange,
  onPick,
}: {
  library: BrandLibrary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (assets: readonly BrandAsset[]) => void;
}) {
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());

  const assets = [...(library.avatar ? [library.avatar] : []), ...library.products];

  function toggle(id: string) {
    setChosen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  function confirm() {
    onPick(assets.filter((asset) => chosen.has(asset.id)));
    setChosen(new Set());
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-hairline bg-paper p-5 shadow-card data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <Dialog.Title className="text-sm font-semibold text-ink">Your pictures</Dialog.Title>
          <Dialog.Description className="mt-1 text-xs text-ink-soft">
            Pick what should be in the video. You can choose more than one.
          </Dialog.Description>

          <ul className="mt-5 flex max-h-[50vh] flex-wrap gap-3 overflow-y-auto">
            {assets.map((asset) => {
              const active = chosen.has(asset.id);
              return (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => toggle(asset.id)}
                    aria-pressed={active}
                    className={cn(
                      "relative block size-24 cursor-pointer overflow-hidden rounded-xl border-2 transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      active ? "border-ink" : "border-transparent hover:border-hairline",
                    )}
                  >
                    {asset.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={asset.url}
                        alt={asset.kind === "avatar" ? "You" : asset.label || "Product"}
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center bg-cloud">
                        {asset.kind === "avatar" ? (
                          <UserRound className="size-6 text-ink-soft" aria-hidden />
                        ) : (
                          <Package className="size-6 text-ink-soft" aria-hidden />
                        )}
                      </span>
                    )}

                    {active ? (
                      <span className="absolute right-1.5 top-1.5 inline-flex size-5 items-center justify-center rounded-full bg-ink text-paper">
                        <Check className="size-3" aria-hidden />
                      </span>
                    ) : null}
                  </button>
                  <p className="mt-1.5 w-24 truncate text-xs text-ink-soft">
                    {asset.kind === "avatar" ? "You" : asset.label}
                  </p>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-9 cursor-pointer items-center rounded-full px-4 text-xs font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={confirm}
              disabled={chosen.size === 0}
              className="inline-flex h-9 cursor-pointer items-center rounded-full bg-ink px-4 text-xs font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              Attach {chosen.size > 0 ? chosen.size : ""}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
