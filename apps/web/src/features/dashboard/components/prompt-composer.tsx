"use client";

import { Sparkles, Square, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
} from "react";

import { useComposerDrop } from "../hooks/use-composer-drop";
import { type PendingFootage } from "../hooks/use-footage-upload";
import { type PendingVoice } from "../hooks/use-voice-upload";
import { SendButton } from "@/components/ui/send-button";
import { cn } from "@/lib/utils";
import { type GenerationMode } from "@/lib/chat/send-schema";

import { ComposeMenu, type PendingPhoto } from "./compose-menu";
import { FootageChip } from "./footage-chip";
import { RecordButton } from "./record-button";
import { ShotListEditor, type PendingShot } from "./shot-list-editor";
import { VoiceChip } from "./voice-chip";
import { Spinner } from "@/components/ui/spinner";
import { AvatarSelector } from "./avatar-selector";
import { GenerationModeSelector } from "./generation-mode-selector";

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
  generationMode?: GenerationMode;
  onGenerationModeChange?: (mode: GenerationMode) => void;
  /**
   * Stops reading the turn in flight. Absent where there is nothing to stop,
   * which is the dashboard composer: it navigates before a turn begins.
   */
  onStop?: () => void;
  /** Selected avatar ID for generation. */
  selectedAvatarId?: string | null;
  /** Called when avatar selection changes. */
  onSelectedAvatarChange?: (avatarId: string | null) => void;
  /** Whether this caller has a ready cloned voice at all, so the chip can offer it. */
  clonedVoiceAvailable?: boolean;
  /** Whether "speak this in your voice" is on. Additive to, not instead of, `voice`. */
  useClonedVoice?: boolean;
  onUseClonedVoiceChange?: (value: boolean) => void;
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
  generationMode,
  onGenerationModeChange,
  onStop,
  selectedAvatarId,
  onSelectedAvatarChange,
  clonedVoiceAvailable,
  useClonedVoice,
  onUseClonedVoiceChange,
}: PromptComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = value.trim().length > 0 && !busy && !uploading;
  const drop = useComposerDrop({
    projectId,
    onPhotos: onPhotosChange,
    onVoice,
    onFootage,
    onError: setError,
    onBusyChange: setUploading,
  });
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
      ? "Sending your message"
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
    <div
      onDragOver={drop.onDragOver}
      onDragLeave={drop.onDragLeave}
      onDrop={drop.onDrop}
      className={cn(
        "relative rounded-[22px] border px-1 py-1 transition-colors",
        drop.dragging ? "border-primary border-dashed bg-primary/5" : "border-hairline bg-paper",
      )}
    >
      {drop.dragging ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[22px] bg-paper/90 text-sm font-medium text-primary"
        >
          Drop to attach
        </div>
      ) : null}
      {voice ? <VoiceChip voice={voice} onRemove={() => onVoice(null)} /> : null}
      {/*
        A second, additive way to give an avatar render its voice: the
        existing record-a-clip flow above is untouched, this only appears
        once that path is not in use and this caller actually has a cloned
        voice to offer. Photos gate it too: with none attached and no saved
        likeness, there is nothing for the clone to speak over yet.
      */}
      {!voice && clonedVoiceAvailable && onUseClonedVoiceChange ? (
        <button
          type="button"
          onClick={() => onUseClonedVoiceChange(!useClonedVoice)}
          aria-pressed={useClonedVoice}
          className={cn(
            "mx-1 mb-2 flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-medium transition-colors",
            useClonedVoice
              ? "border-primary bg-primary/10 text-primary"
              : "border-hairline bg-canvas text-ink-soft hover:text-ink",
          )}
        >
          <Sparkles className="size-3.5" aria-hidden />
          {useClonedVoice ? "Speaking in your voice" : "Speak this in your voice"}
        </button>
      ) : null}
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
                  <Spinner className="size-4 text-paper drop-shadow" />
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

      {/*
        The exact combination that triggers avatar mode (see runAvatar in
        conversation-thread.tsx), named before it is sent rather than
        explained after. Avatar mode cannot cut between scenes the way a
        generated video can, so someone who actually wanted the richer
        multi-scene path should find out now, not after the render starts.
      */}
      {voice && photos.length > 0 ? (
        <p className="px-1 pb-2 text-xs text-ink-soft">
          Photo plus voice makes one continuous clip of you talking. For a multi-scene video, start
          from a TikTok reference in Discover and write a script instead.
        </p>
      ) : null}

      <div className="flex min-h-9 items-end gap-1 px-1">
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
        {onSelectedAvatarChange ? (
          <AvatarSelector
            selectedAvatarId={selectedAvatarId ?? null}
            onSelect={onSelectedAvatarChange}
          />
        ) : null}
        <GenerationModeSelector
          mode={generationMode ?? "auto"}
          onChange={onGenerationModeChange ?? (() => {})}
        />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Describe a video to create"
          aria-label="Describe a video to create"
          className="block max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-1 text-base leading-7 text-ink placeholder:text-ink-soft focus:outline-none"
        />
        <div className="flex items-center gap-2">
          <RecordButton
            projectId={projectId}
            onVoice={onVoice}
            onError={setError}
            onBusyChange={setUploading}
          />
          {/*
            One button, two jobs. While a turn is running the only useful thing
            here is to stop it, and a spinner that cannot be pressed was the
            product asking somebody to wait with no way out.
          */}
          {busy && onStop ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop"
              title="Stop"
              className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-ink text-paper transition-opacity hover:opacity-90"
            >
              <Square className="size-3 fill-current" aria-hidden />
            </button>
          ) : (
            <SendButton
              onClick={() => canSubmit && onSubmit()}
              disabled={!canSubmit}
              busy={uploading}
              hint={sendReason}
            />
          )}
        </div>
      </div>

      {error ? (
        <p role="alert" className="px-3 pt-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {/*
        The price, next to the button that pays it.
        
        The balance was on the billing page and the overview tile and nowhere
        near here, so the way to find out the account was empty was to write a
        brief, send it, and be refused. Stated quietly: this is a fact worth
        having, not a warning, right up until there is not enough for one video.
      */}
    </div>
  );
}
