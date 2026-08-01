"use client";

import { useCallback, useRef, useState } from "react";

import { attachUploadedAudio, createAudioTicket } from "@/features/chat/audio-upload-actions";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

/**
 * Picking a voice clip for an avatar render.
 *
 * The upload goes straight from the browser to storage against a signed ticket,
 * the same as photos: a voice recording is far larger than the body a server
 * action will accept, so routing the bytes through one would reject every real
 * clip.
 *
 * Kept as a hook rather than a component so the compose menu can own the markup
 * and stay a single readable file.
 */

export interface PendingVoice {
  readonly url: string;
  readonly path: string;
  /** The name the file had on the user's device, so the chip is recognisable. */
  readonly name: string;
}

/** What the provider accepts, so the picker cannot offer a file it will refuse. */
export const VOICE_ACCEPT = "audio/mpeg,audio/wav,audio/aac,audio/mp4,audio/ogg";

interface Options {
  projectId: string;
  onVoice: (voice: PendingVoice) => void;
  onError: (message: string) => void;
  onBusyChange: (busy: boolean) => void;
}

export function useVoiceUpload({ projectId, onVoice, onError, onBusyChange }: Options) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const open = useCallback(() => inputRef.current?.click(), []);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      // Cleared immediately, so choosing the same clip twice still fires change.
      event.currentTarget.value = "";
      if (!file) return;

      setUploading(true);
      onBusyChange(true);
      void (async () => {
        try {
          const ticketed = await createAudioTicket({ type: file.type, size: file.size });
          if (ticketed.status !== "ok") {
            onError(
              ticketed.status === "unconfigured"
                ? "Uploads need the backend connected."
                : ticketed.message,
            );
            return;
          }

          const supabase = createBrowserClient();
          const { error } = await supabase.storage
            .from("uploads")
            .uploadToSignedUrl(ticketed.ticket.path, ticketed.ticket.token, file, {
              contentType: file.type,
            });
          if (error) throw new Error(error.message);

          const attached = await attachUploadedAudio({
            projectId,
            path: ticketed.ticket.path,
          });
          if (attached.status === "ok") {
            onVoice({ url: attached.url, path: attached.path, name: file.name });
            return;
          }
          onError(
            attached.status === "unconfigured"
              ? "Uploads need the backend connected."
              : attached.message,
          );
        } catch (error) {
          onError(error instanceof Error ? error.message : "Could not upload that clip");
        } finally {
          setUploading(false);
          onBusyChange(false);
        }
      })();
    },
    [projectId, onVoice, onError, onBusyChange],
  );

  return { inputRef, open, uploading, handleChange };
}
