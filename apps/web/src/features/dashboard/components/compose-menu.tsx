"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ImagePlus, Music, Plus, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";
import { type Route } from "next";
import { useRouter } from "next/navigation";
import { useRef } from "react";

interface MenuItem {
  icon: LucideIcon;
  label: string;
  hint: string;
  upload?: boolean;
  navigate?: string;
}

const ITEMS: readonly MenuItem[] = [
  { icon: ImagePlus, label: "Add photos & files", hint: "Upload from computer", upload: true },
  { icon: Music, label: "Music library", hint: "Add a track" },
  {
    icon: TrendingUp,
    label: "Browse trends",
    hint: "Find a format to remix",
    navigate: "/dashboard/trends",
  },
  { icon: Sparkles, label: "Templates", hint: "Start from a preset" },
];

export function ComposeMenu() {
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(event) => {
          // Upload is wired to storage in a later phase; reset so the same
          // file can be picked again.
          event.currentTarget.value = "";
        }}
      />
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="Add photos and more"
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-hairline text-ink transition-colors hover:bg-cloud"
          >
            <Plus className="size-4" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={8}
            className="z-50 w-72 rounded-2xl border border-hairline bg-paper p-1.5 text-ink shadow-card data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          >
            {ITEMS.map((item) => (
              <DropdownMenu.Item
                key={item.label}
                onSelect={() => {
                  if (item.upload) {
                    fileRef.current?.click();
                  } else if (item.navigate) {
                    router.push(item.navigate as Route);
                  }
                }}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-cloud"
              >
                <item.icon className="size-4 shrink-0 text-ink-soft" />
                <span>{item.label}</span>
                <span className="ml-auto text-xs text-ink-soft">{item.hint}</span>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  );
}
