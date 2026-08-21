"use client";

import { useCallback, useRef, useState } from "react";

import { createVideoUploadTicket } from "@/features/chat/video-upload-actions";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

/**
 * Picking footage for a run that edits video or copies motion from it.
 *
 * The bytes go straight from the browser to storage against a signed ticket,
 * for the same reason photos and voice clips do, only more so: the ceiling here
 * is a hundred megabytes, and no server action will take a body that size.
 *
 * Unlike a photo or a voice clip this is not attached to the message. Footage
 * is an input to the render rather than something the thread shows back, so it
 * is held as a path until the turn is sent and never written to
 * `message_attachments`.
 */

export interface PendingFootage {
  readonly path: string;
  /** The name it had on the device, so the chip is recognisable. */
  readonly name: string;
}

export const VIDEO_ACCEPT = "video/mp4,video/quicktime";

interface Options {
  onFootage: (footage: PendingFootage) => void;
  onError: (message: string) => void;
  onBusyChange: (busy: boolean) => void;
}

export function useFootageUpload({ onFootage, onError, onBusyChange }: Options) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const open = useCallback(() => inputRef.current?.click(), []);

  const upload = useCallback(
    (file: File) => {
      setUploading(true);
      onBusyChange(true);
      void (async () => {
        try {
          const ticketed = await createVideoUploadTicket({ type: file.type, size: file.size });
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
            .from("video-uploads")
            .uploadToSignedUrl(ticketed.path, ticketed.token, file, { contentType: file.type });
          if (error) throw new Error(error.message);

          onFootage({ path: ticketed.path, name: file.name });
        } catch (error) {
          onError(error instanceof Error ? error.message : "Could not upload that video");
        } finally {
          setUploading(false);
          onBusyChange(false);
        }
      })();
    },
    [onFootage, onError, onBusyChange],
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      // Cleared immediately, so choosing the same file twice still fires change.
      event.currentTarget.value = "";
      if (file) upload(file);
    },
    [upload],
  );

  return { inputRef, open, uploading, handleChange };
}
