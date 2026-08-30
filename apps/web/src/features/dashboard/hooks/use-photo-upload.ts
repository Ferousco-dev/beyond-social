"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";

import { attachUploadedPhotos, createUploadTickets } from "@/features/chat/upload-actions";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

import { type PendingPhoto } from "../components/compose-menu";

/**
 * Attaching photos to the composer, whichever way they were obtained.
 *
 * Extracted from `ComposeMenu` so a photo captured live from the camera goes
 * through the exact same ticket-upload-attach path as one picked from disk,
 * the same reasoning `useVoiceUpload` already applies to a recorded clip: there
 * is nothing different about the bytes once they exist.
 *
 * Shown as a local preview immediately rather than waiting on the round trip:
 * the browser already has the file, and the server side of this is upload,
 * download, the likeness classifier, and a signed link, which is seconds long.
 */

/** Long enough for the swap to paint before the blob goes away. */
const REVOKE_DELAY_MS = 1000;

interface Options {
  projectId: string;
  onPhotos: Dispatch<SetStateAction<readonly PendingPhoto[]>>;
  onError: (message: string) => void;
  onBusyChange: (busy: boolean) => void;
}

export function usePhotoUpload({ projectId, onPhotos, onError, onBusyChange }: Options) {
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(
    (files: readonly File[]) => {
      if (files.length === 0) return;

      setUploading(true);
      onBusyChange(true);

      const previews: PendingPhoto[] = files.map((file) => ({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
        path: "",
        pending: true,
      }));
      onPhotos((current) => [...current, ...previews]);

      const drop = () => {
        onPhotos((current) => current.filter((p) => !previews.some((v) => v.id === p.id)));
        previews.forEach((preview) => URL.revokeObjectURL(preview.url));
      };

      void (async () => {
        try {
          const ticketed = await createUploadTickets({
            files: files.map((file) => ({ type: file.type, size: file.size })),
          });
          if (ticketed.status !== "ok") {
            drop();
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
                .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type })
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
            onPhotos((current) =>
              current.map((photo) => {
                const index = previews.findIndex((preview) => preview.id === photo.id);
                const settled = index === -1 ? undefined : attached.photos[index];
                return settled ? { id: photo.id, url: settled.url, path: settled.path } : photo;
              }),
            );
            window.setTimeout(
              () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)),
              REVOKE_DELAY_MS,
            );
            return;
          }
          drop();
          onError(
            attached.status === "unconfigured"
              ? "Uploads need the backend connected."
              : attached.message,
          );
        } catch (error) {
          drop();
          onError(error instanceof Error ? error.message : "Could not upload that photo");
        } finally {
          setUploading(false);
          onBusyChange(false);
        }
      })();
    },
    [projectId, onPhotos, onError, onBusyChange],
  );

  return { upload, uploading };
}
