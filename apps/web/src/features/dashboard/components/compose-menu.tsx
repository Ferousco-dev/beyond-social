"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Clapperboard,
  ImagePlus,
  Images,
  Mic,
  Music,
  Plus,
  Scissors,
  Sparkles,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { type Route } from "next";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { PicturePicker } from "@/features/assets/components/picture-picker";
import { useBrandLibrary } from "@/features/assets/hooks/use-brand-library";
import { attachUploadedPhotos, createUploadTickets } from "@/features/chat/upload-actions";
import { useSavedVoice } from "@/features/voice/use-saved-voice";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

import { useFootageUpload, VIDEO_ACCEPT, type PendingFootage } from "../hooks/use-footage-upload";
import { useVoiceUpload, VOICE_ACCEPT, type PendingVoice } from "../hooks/use-voice-upload";

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
  voice?: boolean;
  savedVoice?: boolean;
  footage?: boolean;
  shots?: boolean;
  saved?: boolean;
  navigate?: string;
}

const BASE_ITEMS: readonly MenuItem[] = [
  { icon: ImagePlus, label: "Add photos", hint: "They become the footage", upload: true },
  {
    icon: TrendingUp,
    label: "Search TikTok",
    hint: "Find a post to build from",
    navigate: "/dashboard/trends",
  },
  { icon: Mic, label: "Add your voice", hint: "Speak, and the photo speaks it", voice: true },
  {
    icon: Clapperboard,
    label: "Add a video",
    hint: "Copy its motion onto a photo",
    footage: true,
  },
  {
    icon: Scissors,
    label: "Add shots",
    hint: "Cut between scenes in one call",
    shots: true,
  },
  { icon: Music, label: "Music library", hint: "Add a track in the editor" },
  { icon: Sparkles, label: "Templates", hint: "Start from a preset" },
];

const SAVED_VOICE_ITEM: MenuItem = {
  icon: UserRound,
  label: "Use saved voice",
  hint: "Type what you want said in your voice",
  savedVoice: true,
};

const SAVED_PICTURES_ITEM: MenuItem = {
  icon: Images,
  label: "Use your pictures",
  hint: "You and your products, already saved",
  saved: true,
};

/**
 * The composer's attachment menu.
 *
 * Photos upload as soon as they are chosen rather than on send, so the slow part
 * happens while the user is still writing and pressing send stays instant.
 */
export function ComposeMenu({
  projectId,
  onPhotos,
  onVoice,
  onFootage,
  onShots,
  onError,
  onBusyChange,
}: {
  projectId: string;
  onPhotos: (photos: readonly PendingPhoto[]) => void;
  onVoice: (voice: PendingVoice) => void;
  onFootage: (footage: PendingFootage) => void;
  onShots: () => void;
  onError: (message: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const voice = useVoiceUpload({ projectId, onVoice, onError, onBusyChange });
  const footage = useFootageUpload({ onFootage, onError, onBusyChange });
  const savedVoice = useSavedVoice();
  const saved = useBrandLibrary();
  const [picking, setPicking] = useState(false);

  const withVoice = savedVoice.profile
    ? [BASE_ITEMS[0]!, BASE_ITEMS[1]!, SAVED_VOICE_ITEM, BASE_ITEMS[2]!, ...BASE_ITEMS.slice(3)]
    : BASE_ITEMS;

  // Offered only when there is something saved. An entry that opens an empty
  // picker teaches the user that the menu lies about what it can do.
  const items = saved.has ? [SAVED_PICTURES_ITEM, ...withVoice] : withVoice;

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

          setUploading(true);
          onBusyChange(true);
          void (async () => {
            try {
              // The server only issues tickets. Sending the files themselves
              // through a server action capped them at 1MB, which is smaller
              // than any photo a phone takes.
              const ticketed = await createUploadTickets({
                files: files.map((file) => ({ type: file.type, size: file.size })),
              });
              if (ticketed.status !== "ok") {
                onError(
                  ticketed.status === "unconfigured"
                    ? "Uploads need the backend connected."
                    : ticketed.message,
                );
                return;
              }

              const supabase = createBrowserClient();
              await Promise.all(
                ticketed.tickets.map((ticket, index) => {
                  const file = files[index];
                  if (!file) throw new Error("Missing file for ticket");
                  return supabase.storage
                    .from("uploads")
                    .uploadToSignedUrl(ticket.path, ticket.token, file, {
                      contentType: file.type,
                    })
                    .then(({ error }) => {
                      if (error) throw new Error(error.message);
                    });
                }),
              );

              const attached = await attachUploadedPhotos({
                projectId,
                paths: ticketed.tickets.map((ticket) => ticket.path),
              });
              if (attached.status === "ok") {
                onPhotos(attached.photos);
                return;
              }
              onError(
                attached.status === "unconfigured"
                  ? "Uploads need the backend connected."
                  : attached.message,
              );
            } catch (error) {
              onError(error instanceof Error ? error.message : "Could not upload that photo");
            } finally {
              setUploading(false);
              onBusyChange(false);
            }
          })();
        }}
      />
      <input
        ref={voice.inputRef}
        type="file"
        accept={VOICE_ACCEPT}
        className="hidden"
        onChange={voice.handleChange}
      />
      <input
        ref={footage.inputRef}
        type="file"
        accept={VIDEO_ACCEPT}
        className="hidden"
        onChange={footage.handleChange}
      />
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="Add photos and more"
            disabled={uploading || voice.uploading || footage.uploading}
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
            {items.map((item) => (
              <DropdownMenu.Item
                key={item.label}
                onSelect={() => {
                  if (item.upload) {
                    fileRef.current?.click();
                  } else if (item.saved) {
                    setPicking(true);
                  } else if (item.savedVoice) {
                    const pending = savedVoice.toPendingVoice();
                    if (pending) onVoice(pending);
                  } else if (item.voice) {
                    voice.open();
                  } else if (item.footage) {
                    footage.open();
                  } else if (item.shots) {
                    onShots();
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

      <PicturePicker
        library={saved.library}
        open={picking}
        onOpenChange={setPicking}
        // Already in storage and already signed, so a saved picture is attached
        // without a round trip: it is the same shape a fresh upload ends up as.
        onPick={(assets) =>
          onPhotos(
            assets
              .filter((asset): asset is typeof asset & { url: string } => asset.url !== null)
              .map((asset) => ({ url: asset.url, path: asset.path })),
          )
        }
      />
    </>
  );
}
