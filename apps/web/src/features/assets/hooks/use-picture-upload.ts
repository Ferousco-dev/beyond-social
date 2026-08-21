"use client";

import { useCallback, useState } from "react";

import { createUploadTickets } from "@/features/chat/upload-actions";
import { createClient } from "@/lib/supabase/client";

/**
 * Putting one picture in storage.
 *
 * The bytes never pass through the server: it issues a signed ticket for a path
 * it chose, and the browser uploads straight to storage. Same reasoning as the
 * composer's photo upload, and the same action issues the ticket, because a
 * second way to get an image into the bucket is a second thing to keep in step.
 *
 * Returns the storage path. Saving it as an avatar or a product is a separate
 * step, since that is where consent and classification live.
 */
export function usePictureUpload() {
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const ticket = await createUploadTickets({
        files: [{ type: file.type, size: file.size }],
      });
      if (ticket.status !== "ok" || !ticket.tickets[0]) return null;

      const { path, token } = ticket.tickets[0];
      const supabase = createClient();
      const { error } = await supabase.storage.from("uploads").uploadToSignedUrl(path, token, file);

      return error ? null : path;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading };
}
