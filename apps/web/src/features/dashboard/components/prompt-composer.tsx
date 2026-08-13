"use client";

import { ArrowUp, Loader2, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
} from "react";

import { type PendingFootage } from "../hooks/use-footage-upload";
import { type PendingVoice } from "../hooks/use-voice-upload";
import { cn } from "@/lib/utils";

import { ComposeMenu, type PendingPhoto } from "./compose-menu";
import { FootageChip } from "./footage-chip";
import { RecordButton } from "./record-button";
import { ShotListEditor, type PendingShot } from "./shot-list-editor";
import { VoiceChip } from "./voice-chip";

interface PromptComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  projectId: string;
  photos: readonly PendingPhoto[];
  /** React's updater signature, so the menu can settle a preview in place. */
  onPhotosChange: Dispatch<SetStateAction<readonly PendingPhoto[]>>;
  busy: boolean;
  /** Sets or clears the attached clip. Null is how the chip removes it. */
  onVoice: (voice: PendingVoice | null) => void;
  /** The clip currently attached, if any, so it can be shown and removed. */
  voice: PendingVoice | null;
  /** Sets or clears the attached footage. Null is how the chip removes it. */
  onFootage: (footage: PendingFootage | null) => void;
  /** The footage currently attached, if any. */
  footage: PendingFootage | null;
  /** The shot list for multi-shot generation. Null when not using shots. */
  shots: readonly PendingShot[] | null;
  onShotsChange: (shots: readonly PendingShot[] | null) => void;
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
  shots,
  onShotsChange,
}: PromptComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = value.trim().length > 0 && !busy && !uploading;
  /*
   * Why the button is off, rather than only that it is.
   *
   * It was labelled "Send" in all four states, so a greyed-out button during a
   * render read as broken rather than busy, and there was nothing on the page
   * saying to wait. The reason is both the accessible name and the tooltip,
   * because a pointer user gets no announcement and a screen reader user gets
   * no hover.
   */
  const sendReason = uploading
    ? "Wait for the upload to finish"
    : busy
      ? "Wait for the current video to finish"
      : value.trim() === ""
        ? "Describe a video first"
        : "Send";

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
      {shots !== null && shots.length > 0 ? (
        <ShotListEditor
          shots={shots}
          onChange={(next) => onShotsChange(next)}
          onRemoveAll={() => onShotsChange(null)}
        />
      ) : null}
      {photos.length > 0 ? (
        <ul className="flex flex-wrap gap-2 px-1 pb-2">
          {photos.map((photo) => (
            <li key={photo.id} className="relative">
              {/* Plain img: these are signed, short-lived URLs on an arbitrary
                  host, which the image optimiser cannot be configured for, and
                  a local blob before that. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt=""
                className={cn(
                  "size-14 rounded-lg border border-hairline object-cover transition-opacity",
                  // Dimmed while the server is still classifying and signing it.
                  // The picture is right; only its link is provisional.
                  photo.pending && "opacity-60",
                )}
              />
              {photo.pending ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="size-4 animate-spin text-paper drop-shadow" aria-hidden />
                  <span className="sr-only">Uploading</span>
                </span>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  onPhotosChange((current) => current.filter((item) => item.id !== photo.id))
                }
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
          onShots={() => {
            if (shots === null || shots.length === 0) {
              onShotsChange([
                { prompt: "", duration: 5 },
                { prompt: "", duration: 5 },
              ]);
            }
          }}
          onPhotos={(update) => {
            setError(null);
            onPhotosChange(update);
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
            aria-label={sendReason}
            title={sendReason}
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
