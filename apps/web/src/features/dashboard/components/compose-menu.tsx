"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ImagePlus, Music, Plus, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";
import { type Route } from "next";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { uploadPhotos } from "@/features/chat/upload-actions";

/** A photo already uploaded and waiting to be attached to the next message. */
export interface PendingPhoto {
  readonly url: string;
  readonly path: string;
}

interface MenuItem {
  icon: LucideIcon;
  label: string;
  hint: string;
  upload?: boolean;
  navigate?: string;
}

const ITEMS: readonly MenuItem[] = [
  { icon: ImagePlus, label: "Add photos", hint: "They become the footage", upload: true },
  {
    icon: TrendingUp,
    label: "Browse trends",
    hint: "Find a format to remix",
    navigate: "/dashboard/trends",
  },
  { icon: Music, label: "Music library", hint: "Add a track in the editor" },
  { icon: Sparkles, label: "Templates", hint: "Start from a preset" },
];

/**
 * The composer's attachment menu.
 *
 * Photos upload as soon as they are chosen rather than on send, so the slow part
 * happens while the user is still writing and pressing send stays instant.
 */
export function ComposeMenu({
  projectId,
  onPhotos,
  onError,
  onBusyChange,
}: {
  projectId: string;
  onPhotos: (photos: readonly PendingPhoto[]) => void;
  onError: (message: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          // Reset immediately, so picking the same file twice still fires change.
          event.currentTarget.value = "";
          if (files.length === 0) return;

          const form = new FormData();
          form.set("projectId", projectId);
          for (const file of files) form.append("files", file);

          setUploading(true);
          onBusyChange(true);
          void (async () => {
            const result = await uploadPhotos(form);
            setUploading(false);
            onBusyChange(false);
            if (result.status === "ok") {
              onPhotos(result.photos);
              return;
            }
            onError(
              result.status === "unconfigured"
                ? "Uploads need the backend connected."
                : result.message,
            );
          })();
        }}
      />
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="Add photos and more"
            disabled={uploading}
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-hairline text-ink transition-colors hover:bg-cloud disabled:cursor-not-allowed disabled:opacity-50"
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
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 outline-none data-[highlighted]:bg-cloud"
              >
                <item.icon className="size-4 shrink-0 text-ink-soft" aria-hidden />
                {/* Stacked so a longer label never has to share a line with its hint. */}
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink">{item.label}</span>
                  <span className="block truncate text-xs text-ink-soft">{item.hint}</span>
                </span>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  );
}
