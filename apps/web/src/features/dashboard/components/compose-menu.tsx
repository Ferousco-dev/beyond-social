"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Clapperboard,
  ImagePlus,
  Images,
  Mic,
  Plus,
  Radio,
  Scissors,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { type Route } from "next";
import { useRouter } from "next/navigation";
import { useRef, useState, type Dispatch, type SetStateAction } from "react";

import { LiveCaptureDialog } from "@/components/media/live-capture-dialog";
import { PicturePicker } from "@/features/assets/components/picture-picker";
import { useBrandLibrary } from "@/features/assets/hooks/use-brand-library";
import { useSavedVoice } from "@/features/voice/use-saved-voice";

import { useFootageUpload, VIDEO_ACCEPT, type PendingFootage } from "../hooks/use-footage-upload";
import { usePhotoUpload } from "../hooks/use-photo-upload";
import { useVoiceUpload, VOICE_ACCEPT, type PendingVoice } from "../hooks/use-voice-upload";

/**
 * A photo waiting to be attached to the next message.
 *
 * Shown from the moment it is chosen, not from the moment the server is done
 * with it. Attaching used to wait on the whole round trip: the browser uploads
 * to storage, then the server downloads the object back, runs the likeness
 * classifier over it, records the asset and signs a link. That is seconds of a
 * blank composer for something the browser already had in its hand.
 */
export interface PendingPhoto {
  /** Stable across the swap from local preview to signed URL. */
  readonly id: string;
  /** A local blob while pending, the signed link once the server answers. */
  readonly url: string;
  /** Empty until the upload lands. Sending is blocked while any photo is. */
  readonly path: string;
  readonly pending?: boolean;
}

interface MenuItem {
  icon: LucideIcon;
  label: string;
  hint: string;
  upload?: boolean;
  live?: boolean;
  voice?: boolean;
  savedVoice?: boolean;
  footage?: boolean;
  shots?: boolean;
  saved?: boolean;
  navigate?: string;
}

const BASE_ITEMS: readonly MenuItem[] = [
  { icon: ImagePlus, label: "Add photos", hint: "They become the footage", upload: true },
  { icon: Radio, label: "Go live", hint: "Take a photo with your camera", live: true },
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
  /**
   * React's own updater signature, so the menu can append a preview now and
   * swap it for the signed version later rather than only ever appending.
   */
  onPhotos: Dispatch<SetStateAction<readonly PendingPhoto[]>>;
  onVoice: (voice: PendingVoice) => void;
  onFootage: (footage: PendingFootage) => void;
  onShots: () => void;
  onError: (message: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const photo = usePhotoUpload({ projectId, onPhotos, onError, onBusyChange });
  const voice = useVoiceUpload({ projectId, onVoice, onError, onBusyChange });
  const footage = useFootageUpload({ onFootage, onError, onBusyChange });
  const savedVoice = useSavedVoice();
  const saved = useBrandLibrary();
  const [picking, setPicking] = useState(false);
  const [going, setGoing] = useState(false);

  // Inserted just before "Add your voice" rather than at a fixed index, so
  // adding or reordering an item above it cannot silently misplace this one.
  const voiceIndex = BASE_ITEMS.findIndex((item) => item.voice);
  const withVoice = savedVoice.profile
    ? [...BASE_ITEMS.slice(0, voiceIndex), SAVED_VOICE_ITEM, ...BASE_ITEMS.slice(voiceIndex)]
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
          photo.upload(files);
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
            data-tip-anchor="compose-plus"
            aria-label="Add photos and more"
            disabled={photo.uploading || voice.uploading || footage.uploading}
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
                  } else if (item.live) {
                    setGoing(true);
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
          onPhotos((current) => [
            ...current,
            // Already in storage and already signed, so these arrive settled.
            ...assets
              .filter((asset): asset is typeof asset & { url: string } => asset.url !== null)
              .map((asset) => ({ id: asset.id, url: asset.url, path: asset.path })),
          ])
        }
      />

      <LiveCaptureDialog
        open={going}
        onOpenChange={setGoing}
        onCapture={(file) => photo.upload([file])}
      />
    </>
  );
}
