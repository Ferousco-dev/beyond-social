"use client";

import { ArrowUp, Loader2, X } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";

import { ComposeMenu, type PendingPhoto } from "./compose-menu";

interface PromptComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  projectId: string;
  photos: readonly PendingPhoto[];
  onPhotosChange: (photos: readonly PendingPhoto[]) => void;
  busy: boolean;
}

export function PromptComposer({
  value,
  onChange,
  onSubmit,
  projectId,
  photos,
  onPhotosChange,
  busy,
}: PromptComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = value.trim().length > 0 && !busy && !uploading;

  function handleChange(next: string) {
    onChange(next);
    const element = textareaRef.current;
    if (element) {
      element.style.height = "auto";
      element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) onSubmit();
    }
  }

  return (
    <div className="rounded-[26px] bg-paper p-3 shadow-card">
      {photos.length > 0 ? (
        <ul className="flex flex-wrap gap-2 px-1 pb-2">
          {photos.map((photo) => (
            <li key={photo.path} className="relative">
              {/* Plain img: these are signed, short-lived URLs on an arbitrary
                  host, which the image optimiser cannot be configured for. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt=""
                className="size-14 rounded-lg border border-hairline object-cover"
              />
              <button
                type="button"
                onClick={() => onPhotosChange(photos.filter((item) => item.path !== photo.path))}
                aria-label="Remove photo"
                className="absolute -right-1.5 -top-1.5 inline-flex size-5 items-center justify-center rounded-full border border-hairline bg-paper text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder="Describe a video to create"
        aria-label="Describe a video to create"
        className="block max-h-44 w-full resize-none bg-transparent px-3 py-2.5 text-base leading-7 text-ink placeholder:text-ink-soft focus:outline-none"
      />

      <div className="flex items-center justify-between px-1 pt-1.5">
        <ComposeMenu
          projectId={projectId}
          onPhotos={(next) => {
            setError(null);
            onPhotosChange([...photos, ...next]);
          }}
          onError={setError}
          onBusyChange={setUploading}
        />
        <button
          type="button"
          onClick={() => canSubmit && onSubmit()}
          disabled={!canSubmit}
          aria-label="Send"
          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-ink text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {busy || uploading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ArrowUp className="size-4" />
          )}
        </button>
      </div>

      {error ? (
        <p role="status" className="px-3 pt-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
