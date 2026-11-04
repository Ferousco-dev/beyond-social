"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Film, ImageIcon, Mic, Music, Plus, Square } from "lucide-react";
import { useRef, type ReactNode } from "react";

const ITEM =
  "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm text-ink outline-none data-[highlighted]:bg-cloud";

type Picker = "image" | "video" | "audio";

const ACCEPT: Readonly<Record<Picker, string>> = {
  image: "image/jpeg,image/png,image/webp",
  video: "video/mp4,video/quicktime,video/webm",
  audio: "audio/mpeg,audio/mp4,audio/wav,audio/webm,audio/ogg,.mp3,.m4a,.wav",
};

/** The "+" in the message box: attach a picture, a video or audio, or record a voice note. */
export function AttachMenu({
  onFiles,
  disabled,
  recording,
  canRecord,
  onRecord,
  onStopRecording,
}: {
  readonly onFiles: (files: readonly File[]) => void;
  readonly disabled: boolean;
  readonly recording: boolean;
  readonly canRecord: boolean;
  readonly onRecord: () => void;
  readonly onStopRecording: () => void;
}): ReactNode {
  const input = useRef<HTMLInputElement>(null);

  function pick(kind: Picker): void {
    if (!input.current) return;
    input.current.accept = ACCEPT[kind];
    input.current.click();
  }

  if (recording) {
    return (
      <button
        type="button"
        onClick={onStopRecording}
        aria-label="Stop recording"
        className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-destructive text-destructive-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Square className="size-4 fill-current" aria-hidden />
      </button>
    );
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          disabled={disabled}
          aria-label="Attach a file"
          className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="size-5" aria-hidden />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side="top"
            align="start"
            sideOffset={8}
            className="z-50 w-52 rounded-xl border border-hairline bg-paper p-1.5 shadow-lg"
          >
            <DropdownMenu.Item className={ITEM} onSelect={() => pick("image")}>
              <ImageIcon className="size-4 text-ink-soft" aria-hidden />
              Picture
            </DropdownMenu.Item>
            <DropdownMenu.Item className={ITEM} onSelect={() => pick("video")}>
              <Film className="size-4 text-ink-soft" aria-hidden />
              Video
            </DropdownMenu.Item>
            <DropdownMenu.Item className={ITEM} onSelect={() => pick("audio")}>
              <Music className="size-4 text-ink-soft" aria-hidden />
              Audio file
            </DropdownMenu.Item>
            {canRecord ? (
              <DropdownMenu.Item className={ITEM} onSelect={onRecord}>
                <Mic className="size-4 text-ink-soft" aria-hidden />
                Record a voice note
              </DropdownMenu.Item>
            ) : null}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  );
}
