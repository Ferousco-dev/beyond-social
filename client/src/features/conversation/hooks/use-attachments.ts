"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

import { env } from "@/lib/env";
import { type Attachment } from "@/lib/go-api/schemas";

import { confirmAttachment, requestAttachmentUpload } from "../media-actions";

export const MAX_ATTACHMENTS = 4;

export type DraftAttachment =
  | { readonly key: string; readonly file: File; readonly previewUrl: string | null; readonly state: "uploading" }
  | { readonly key: string; readonly file: File; readonly previewUrl: string | null; readonly state: "ready"; readonly attachment: Attachment }
  | { readonly key: string; readonly file: File; readonly previewUrl: string | null; readonly state: "failed"; readonly message: string };

/** The files being attached to the next message, uploaded as soon as they are picked. */
export function useAttachments(): {
  readonly items: readonly DraftAttachment[];
  readonly add: (files: readonly File[]) => void;
  readonly remove: (key: string) => void;
  readonly clear: () => void;
  readonly busy: boolean;
  readonly readyIds: readonly string[];
  readonly notice: string | null;
} {
  const [items, setItems] = useState<readonly DraftAttachment[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const live = useRef(items);
  useEffect(() => {
    live.current = items;
  });

  const patch = useCallback((key: string, next: DraftAttachment) => {
    setItems((current) => current.map((item) => (item.key === key ? next : item)));
  }, []);

  const upload = useCallback(
    async (key: string, file: File, previewUrl: string | null) => {
      const fail = (message: string) => patch(key, { key, file, previewUrl, state: "failed", message });
      const slot = await requestAttachmentUpload({ name: file.name || "recording", mimeType: baseType(file), size: file.size });
      if (slot.status !== "ok") return fail(slot.message);

      const storage = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      const { error } = await storage.storage
        .from("user-media")
        .uploadToSignedUrl(slot.path, slot.token, file, { contentType: baseType(file) });
      if (error) return fail("The upload did not finish. Try again.");

      const confirmed = await confirmAttachment(slot.id);
      if (confirmed.status !== "ok") return fail(confirmed.message);
      patch(key, { key, file, previewUrl, state: "ready", attachment: confirmed.attachment });
    },
    [patch],
  );

  const add = useCallback(
    (files: readonly File[]) => {
      setNotice(null);
      const room = MAX_ATTACHMENTS - live.current.length;
      if (files.length > room) setNotice(`You can attach up to ${MAX_ATTACHMENTS} files to a message.`);
      for (const file of files.slice(0, Math.max(room, 0))) {
        const key = crypto.randomUUID();
        const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
        setItems((current) => [...current, { key, file, previewUrl, state: "uploading" }]);
        void upload(key, file, previewUrl);
      }
    },
    [upload],
  );

  const remove = useCallback((key: string) => {
    setItems((current) => {
      const gone = current.find((item) => item.key === key);
      if (gone?.previewUrl) URL.revokeObjectURL(gone.previewUrl);
      return current.filter((item) => item.key !== key);
    });
  }, []);

  const clear = useCallback(() => {
    live.current.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
    setItems([]);
    setNotice(null);
  }, []);

  const busy = items.some((item) => item.state === "uploading");
  const readyIds = items.flatMap((item) => (item.state === "ready" ? [item.attachment.id] : []));
  return { items, add, remove, clear, busy, readyIds, notice };
}

/** The type without codec parameters ("audio/webm;codecs=opus" becomes "audio/webm"). */
function baseType(file: File): string {
  return (file.type.split(";")[0] ?? "").toLowerCase();
}
