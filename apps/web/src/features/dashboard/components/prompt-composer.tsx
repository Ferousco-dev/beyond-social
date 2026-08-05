"use client";

import { ArrowUp, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { type PendingFootage } from "../hooks/use-footage-upload";
import { type PendingVoice } from "../hooks/use-voice-upload";
import { ComposeMenu, type PendingPhoto } from "./compose-menu";
import { FootageChip } from "./footage-chip";
import { RecordButton } from "./record-button";
import { VoiceChip } from "./voice-chip";

interface PromptComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  projectId: string;
  photos: readonly PendingPhoto[];
  onPhotosChange: (photos: readonly PendingPhoto[]) => void;
  busy: boolean;
  /** A voice clip chosen for an avatar render, if any. */
  /** Sets or clears the attached clip. Null is how the chip removes it. */
  onVoice: (voice: PendingVoice | null) => void;
  /** The clip currently attached, if any, so it can be shown and removed. */
  voice: PendingVoice | null;
  /** Sets or clears the attached footage. Null is how the chip removes it. */
  onFootage: (footage: PendingFootage | null) => void;
  /** The footage currently attached, if any. */
  footage: PendingFootage | null;
}

export function PromptComposer({
  value,
  onChange,
  onSubmit,
  projectId,
  photos,
  onPhotosChange,
  busy,
  onVoice,
  voice,
  onFootage,
  footage,
}: PromptComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = value.trim().length > 0 && !busy && !uploading;

  /*
   * Keyed on the value rather than done in the change handler, so it responds
   * to every way the text can change and not only to typing.
   *
   * Sending clears the prompt from the parent, which never called the change
   * handler, so the inline height set while typing was left behind: the
   * composer stayed as tall as the message that had just been sent, empty,
   * with the placeholder floating at the top of it.
   */
  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
  }, [value]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) onSubmit();
    }
  }

  return (
    <div className="rounded-[26px] bg-paper p-3 shadow-card">
      {voice ? <VoiceChip voice={voice} onRemove={() => onVoice(null)} /> : null}
      {footage ? <FootageChip footage={footage} onRemove={() => onFootage(null)} /> : null}
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
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder="Describe a video to create"
        aria-label="Describe a video to create"
        className="block max-h-44 w-full resize-none bg-transparent px-3 py-2.5 text-base leading-7 text-ink placeholder:text-ink-soft focus:outline-none"
      />

      <div className="flex items-center justify-between px-1 pt-1.5">
        <ComposeMenu
          projectId={projectId}
          onVoice={onVoice}
          onFootage={onFootage}
          onPhotos={(next) => {
            setError(null);
            onPhotosChange([...photos, ...next]);
          }}
          onError={setError}
          onBusyChange={setUploading}
        />
        <div className="flex items-center gap-2">
          <RecordButton
            projectId={projectId}
            onVoice={onVoice}
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
      </div>

      {error ? (
        <p role="status" className="px-3 pt-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
