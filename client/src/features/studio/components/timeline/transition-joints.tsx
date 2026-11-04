"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, Plus, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

import { endOf } from "../../core/find.ts";
import { setTransition } from "../../core/ops.ts";
import { TRANSITIONS, type Item, type TransitionType } from "../../core/types.ts";
import { useStudio } from "../../store/editor-store";

/** Clips this close are treated as touching, so the cut between them can carry a transition. */
const TOUCHING = 0.05;
const DEFAULT_SECONDS = 0.5;

const NAMES: Readonly<Record<TransitionType, string>> = { fade: "Fade", slide: "Slide", zoom: "Zoom", wipe: "Wipe" };
const LENGTHS = [0.3, 0.5, 1] as const;

/**
 * A button on every cut between two clips, like the joints in CapCut. The
 * transition belongs to the incoming clip and plays over its first moments.
 */
export function TransitionJoints({ items, zoom }: { items: readonly Item[]; zoom: number }) {
  const sorted = [...items].sort((a, b) => a.start - b.start);
  const joints = sorted.slice(1).filter((next, i) => {
    const previous = sorted[i];
    return previous !== undefined && Math.abs(next.start - endOf(previous)) <= TOUCHING;
  });

  return (
    <>
      {joints.map((item) => (
        <Joint key={item.id} item={item} left={item.start * zoom} />
      ))}
    </>
  );
}

function Joint({ item, left }: { item: Item; left: number }) {
  const current = "transition" in item ? item.transition : undefined;
  const apply = (type: TransitionType | null, seconds = current?.duration ?? DEFAULT_SECONDS): void => {
    const failure = useStudio.getState().edit((p) => setTransition(p, item.id, type ? { type, duration: seconds } : null));
    if (failure) useStudio.getState().setNotice(failure);
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={current ? `${NAMES[current.type]} transition, change it` : "Add a transition"}
          onPointerDown={(event) => event.stopPropagation()}
          className={cn(
            "absolute top-1/2 z-20 inline-flex size-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary",
            current ? "border-primary bg-primary text-primary-foreground" : "border-hairline bg-paper text-ink-soft hover:text-ink",
          )}
          style={{ left }}
        >
          {current ? <Sparkles className="size-3" aria-hidden /> : <Plus className="size-3" aria-hidden />}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content sideOffset={6} className="z-50 min-w-44 rounded-lg border border-hairline bg-paper p-1 text-ink shadow-card">
          <DropdownMenu.Label className="px-2.5 py-1.5 text-xs text-ink-soft">Transition</DropdownMenu.Label>
          <MenuItem selected={!current} onSelect={() => apply(null)}>
            None
          </MenuItem>
          {TRANSITIONS.map((type) => (
            <MenuItem key={type} selected={current?.type === type} onSelect={() => apply(type)}>
              {NAMES[type]}
            </MenuItem>
          ))}
          {current ? (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-hairline" />
              <DropdownMenu.Label className="px-2.5 py-1.5 text-xs text-ink-soft">Length</DropdownMenu.Label>
              {LENGTHS.map((seconds) => (
                <MenuItem key={seconds} selected={current.duration === seconds} onSelect={() => apply(current.type, seconds)}>
                  {seconds}s
                </MenuItem>
              ))}
            </>
          ) : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function MenuItem({ selected, onSelect, children }: { selected: boolean; onSelect: () => void; children: React.ReactNode }) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center justify-between gap-4 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-cloud"
    >
      {children}
      {selected ? <Check className="size-3.5" aria-hidden /> : null}
    </DropdownMenu.Item>
  );
}
